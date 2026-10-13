import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId, RunId } from '../structs'
import type { HandlerDeps } from '../generics'
import { BONUS_ROUND_THRESHOLD, findGameOfType } from '../games'

/** Ends the active run, paying the bet times the last reached multiplier */
export async function cashOutRoadRun(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGameOfType(payload.gameId, 'road')

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  // Consistency boundary: exactly the facts this decision depends on.
  // Keep it inline; changing it changes which concurrent writes conflict.
  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const queryResult = await deps.eventStore.read([
    ['road_run_started', filter],
    ['road_lane_crossed', filter],
    ['road_run_hit', filter],
    ['road_run_cashed_out', filter],
    ['bonus_offered', filter],
  ])

  // Events arrive newest first
  let latestRun: { runId: RunId; bet: number; balanceAfter: number } | undefined
  const lastCrossingByRunId = new Map<
    RunId,
    { lane: number; multiplier: number }
  >()
  const endedRunIds = new Set<RunId>()
  let roundsCompleted = 0
  let bonusOffered = false

  for (const event of queryResult.events) {
    switch (event.kind) {
      case 'road_run_started': {
        latestRun ??= {
          runId: event.runId,
          bet: event.bet,
          balanceAfter: event.balanceAfter,
        }
        break
      }
      case 'road_lane_crossed': {
        if (lastCrossingByRunId.has(event.runId) === false) {
          lastCrossingByRunId.set(event.runId, {
            lane: event.lane,
            multiplier: event.multiplier,
          })
        }
        break
      }
      case 'road_run_hit':
      case 'road_run_cashed_out': {
        endedRunIds.add(event.runId)
        roundsCompleted++
        break
      }
      case 'bonus_offered': {
        bonusOffered = true
        break
      }
    }
  }

  if (latestRun === undefined || endedRunIds.has(latestRun.runId)) {
    return { success: false, reason: 'no-active-run' } as const
  }

  const run = latestRun
  const crossing = lastCrossingByRunId.get(run.runId)

  if (crossing === undefined) {
    return { success: false, reason: 'nothing-to-cash-out' } as const
  }

  const win = Math.floor(run.bet * crossing.multiplier)
  const messageId = createId() as CommandId
  const shared = {
    causationId: messageId,
    correlationId: messageId,
    visitorId: deps.visitorId,
    gameId: game.id,
  }

  const offerBonus =
    bonusOffered === false && roundsCompleted + 1 >= BONUS_ROUND_THRESHOLD

  const writeResult = await deps.eventStore.write(
    [
      {
        ...shared,
        kind: 'road_run_cashed_out',
        runId: run.runId,
        lane: crossing.lane,
        multiplier: crossing.multiplier,
        win,
        balanceAfter: run.balanceAfter + win,
        simulated: true,
      },
      ...(offerBonus
        ? [
            {
              ...shared,
              kind: 'bonus_offered' as const,
              simulated: true as const,
            },
          ]
        : []),
    ],
    queryResult.dcb
  )

  if (writeResult.success === false) {
    return writeResult
  }

  return { success: true } as const
}

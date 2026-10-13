import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId, RoadDifficulty, RunId } from '../structs'
import type { HandlerDeps } from '../generics'
import { BONUS_ROUND_THRESHOLD, findGameOfType } from '../games'
import type { Random } from '../slot-engine'

/**
 * Moves the chicken across the next lane of the active run. Whether it gets
 * hit is decided here and persisted; crossing the final lane cashes out.
 */
export async function crossRoadLane(
  deps: HandlerDeps<{ random?: Random }>,
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
  let latestRun:
    | {
        runId: RunId
        bet: number
        difficulty: RoadDifficulty
        balanceAfter: number
      }
    | undefined
  const lanesByRunId = new Map<RunId, number>()
  const endedRunIds = new Set<RunId>()
  let roundsCompleted = 0
  let bonusOffered = false

  for (const event of queryResult.events) {
    switch (event.kind) {
      case 'road_run_started': {
        latestRun ??= {
          runId: event.runId,
          bet: event.bet,
          difficulty: event.difficulty,
          balanceAfter: event.balanceAfter,
        }
        break
      }
      case 'road_lane_crossed': {
        if (lanesByRunId.has(event.runId) === false) {
          lanesByRunId.set(event.runId, event.lane)
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
  const difficulty = game.difficulties[run.difficulty]
  const lane = (lanesByRunId.get(run.runId) ?? 0) + 1
  const random = deps.random ?? Math.random
  const hit = random() < difficulty.demoHitChance
  const multiplier = difficulty.multipliers[lane - 1]!
  const finalLane = lane === difficulty.lanes
  const roundEnds = hit || finalLane
  const messageId = createId() as CommandId

  const shared = {
    causationId: messageId,
    correlationId: messageId,
    visitorId: deps.visitorId,
    gameId: game.id,
  }

  const offerBonus =
    roundEnds &&
    bonusOffered === false &&
    roundsCompleted + 1 >= BONUS_ROUND_THRESHOLD

  const bonusEvents = offerBonus
    ? [{ ...shared, kind: 'bonus_offered' as const, simulated: true as const }]
    : []

  const writeResult = hit
    ? await deps.eventStore.write(
        [
          {
            ...shared,
            kind: 'road_run_hit',
            runId: run.runId,
            lane,
            simulated: true,
          },
          ...bonusEvents,
        ],
        queryResult.dcb
      )
    : await deps.eventStore.write(
        [
          {
            ...shared,
            kind: 'road_lane_crossed',
            runId: run.runId,
            lane,
            multiplier,
          },
          ...(finalLane
            ? [
                {
                  ...shared,
                  kind: 'road_run_cashed_out' as const,
                  runId: run.runId,
                  lane,
                  multiplier,
                  win: Math.floor(run.bet * multiplier),
                  balanceAfter:
                    run.balanceAfter + Math.floor(run.bet * multiplier),
                  simulated: true as const,
                },
              ]
            : []),
          ...bonusEvents,
        ],
        queryResult.dcb
      )

  if (writeResult.success === false) {
    return writeResult
  }

  return { success: true } as const
}

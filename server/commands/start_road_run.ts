import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId, RoadDifficulty, RunId } from '../structs'
import type { HandlerDeps } from '../generics'
import { DEMO_STARTING_BALANCE, findGameOfType } from '../games'

/** Starts a Chicken Cross run with the visitor's current bet, deducting it */
export async function startRoadRun(
  deps: HandlerDeps,
  payload: { gameId: GameId; difficulty: RoadDifficulty }
) {
  const game = findGameOfType(payload.gameId, 'road')

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  if (Object.hasOwn(game.difficulties, payload.difficulty) === false) {
    return { success: false, reason: 'invalid-difficulty' } as const
  }

  // Consistency boundary: exactly the facts this decision depends on.
  // Keep it inline; changing it changes which concurrent writes conflict.
  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const queryResult = await deps.eventStore.read([
    ['bet_changed', filter],
    ['road_run_started', filter],
    ['road_run_hit', filter],
    ['road_run_cashed_out', filter],
  ])

  // Events arrive newest first
  let bet: number | undefined
  let balance: number | undefined
  let latestRunId: RunId | undefined
  const endedRunIds = new Set<RunId>()

  for (const event of queryResult.events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'road_run_started': {
        balance ??= event.balanceAfter
        latestRunId ??= event.runId
        break
      }
      case 'road_run_hit': {
        endedRunIds.add(event.runId)
        break
      }
      case 'road_run_cashed_out': {
        balance ??= event.balanceAfter
        endedRunIds.add(event.runId)
        break
      }
    }
  }

  const session = {
    bet: bet ?? game.defaultBet,
    balance: balance ?? DEMO_STARTING_BALANCE,
    runInProgress:
      latestRunId !== undefined && endedRunIds.has(latestRunId) === false,
  }

  if (session.runInProgress) {
    return { success: false, reason: 'run-in-progress' } as const
  }

  if (session.balance < session.bet) {
    return { success: false, reason: 'insufficient-demo-balance' } as const
  }

  const messageId = createId() as CommandId
  const writeResult = await deps.eventStore.write(
    [
      {
        kind: 'road_run_started',
        causationId: messageId,
        correlationId: messageId,
        visitorId: deps.visitorId,
        gameId: game.id,
        runId: createId() as RunId,
        bet: session.bet,
        difficulty: payload.difficulty,
        balanceAfter: session.balance - session.bet,
      },
    ],
    queryResult.dcb
  )

  if (writeResult.success === false) {
    return writeResult
  }

  return { success: true } as const
}

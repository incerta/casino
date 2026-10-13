import type { HandlerDeps } from '../generics'
import type { GameId, RoadDifficulty, RunId } from '../structs'
import { DEMO_STARTING_BALANCE, findGameOfType } from '../games'
import { bonusStatus } from './shared/bonus-status'

export type ActiveRoadRun = {
  runId: RunId
  difficulty: RoadDifficulty
  bet: number
  /** Lanes crossed so far, 0 right after the start */
  lane: number
  /** Multiplier reached so far, 0 before the first lane */
  multiplier: number
  nextMultiplier: number
  /** What cashing out now would pay */
  potentialWin: number
}

export type FinishedRoadRun = {
  runId: RunId
  difficulty: RoadDifficulty
  outcome: 'hit' | 'cashed_out'
  lane: number
  win: number
}

/** The visitor's Chicken Cross session: balance, bet, active/last run, bonus */
export async function roadSession(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGameOfType(payload.gameId, 'road')

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const { events } = await deps.eventStore.read([
    ['bet_changed', filter],
    ['road_run_started', filter],
    ['road_lane_crossed', filter],
    ['road_run_hit', filter],
    ['road_run_cashed_out', filter],
    ['bonus_offered', filter],
    ['bonus_claimed', filter],
  ])

  // Events arrive newest first
  let bet: number | undefined
  let balance: number | undefined
  let roundsPlayed = 0
  let latestStart:
    { runId: RunId; difficulty: RoadDifficulty; bet: number } | undefined
  let latestEnd:
    | { runId: RunId; outcome: 'hit' | 'cashed_out'; lane: number; win: number }
    | undefined
  const lastCrossingByRunId = new Map<
    RunId,
    { lane: number; multiplier: number }
  >()

  for (const event of events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'road_run_started': {
        balance ??= event.balanceAfter
        latestStart ??= {
          runId: event.runId,
          difficulty: event.difficulty,
          bet: event.bet,
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
      case 'road_run_hit': {
        roundsPlayed++
        latestEnd ??= {
          runId: event.runId,
          outcome: 'hit',
          lane: event.lane,
          win: 0,
        }
        break
      }
      case 'road_run_cashed_out': {
        roundsPlayed++
        balance ??= event.balanceAfter
        latestEnd ??= {
          runId: event.runId,
          outcome: 'cashed_out',
          lane: event.lane,
          win: event.win,
        }
        break
      }
    }
  }

  let activeRun: ActiveRoadRun | null = null
  let lastRun: FinishedRoadRun | null = null

  if (latestStart !== undefined && latestEnd?.runId !== latestStart.runId) {
    const crossing = lastCrossingByRunId.get(latestStart.runId)
    const lane = crossing?.lane ?? 0
    const multiplier = crossing?.multiplier ?? 0
    const difficulty = game.difficulties[latestStart.difficulty]

    activeRun = {
      runId: latestStart.runId,
      difficulty: latestStart.difficulty,
      bet: latestStart.bet,
      lane,
      multiplier,
      nextMultiplier: difficulty.multipliers[lane] ?? multiplier,
      potentialWin: Math.floor(latestStart.bet * multiplier),
    }
  }

  if (latestStart !== undefined && latestEnd?.runId === latestStart.runId) {
    lastRun = { ...latestEnd, difficulty: latestStart.difficulty }
  }

  return {
    success: true,
    data: {
      game,
      balance: balance ?? DEMO_STARTING_BALANCE,
      bet: bet ?? game.defaultBet,
      roundsPlayed,
      activeRun,
      lastRun,
      bonus: bonusStatus(events),
    },
  } as const
}

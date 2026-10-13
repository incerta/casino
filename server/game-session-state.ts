import type { HandlerDeps } from './generics'
import type { GameId, RoundId } from './structs'
import { DEMO_STARTING_BALANCE, type GameConfig } from './games'

type SessionEvent = Awaited<
  ReturnType<typeof readGameSessionEvents>
>['events'][number]

export type BonusStatus = 'none' | 'offered' | 'claimed'

export type LastRound = {
  roundId: RoundId
  bet: number
  reels: readonly string[]
  win: number
}

export type GameSessionState = {
  balance: number
  bet: number
  roundsPlayed: number
  lastRound: LastRound | null
  bonus: BonusStatus
}

/** Reads every event that shapes a visitor's session in one game */
export function readGameSessionEvents(deps: HandlerDeps, gameId: GameId) {
  const filter = { visitorId: deps.visitorId, gameId }

  return deps.eventStore.read([
    ['bet_changed', filter],
    ['round_played', filter],
    ['bonus_offered', filter],
    ['bonus_claimed', filter],
  ])
}

/** Folds session events (newest first, as the store returns them) */
export function foldGameSession(
  game: GameConfig,
  events: ReadonlyArray<SessionEvent>
): GameSessionState {
  let bet: number | undefined
  let lastRound: LastRound | null = null
  let roundsPlayed = 0
  let bonusOffered = false
  let bonusClaimed = false

  for (const event of events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'round_played': {
        roundsPlayed++
        lastRound ??= {
          roundId: event.roundId,
          bet: event.bet,
          reels: event.reels,
          win: event.win,
        }
        break
      }
      case 'bonus_offered': {
        bonusOffered = true
        break
      }
      case 'bonus_claimed': {
        bonusClaimed = true
        break
      }
    }
  }

  const latestRound = events.find((event) => event.kind === 'round_played')

  return {
    balance: latestRound?.balanceAfter ?? DEMO_STARTING_BALANCE,
    bet: bet ?? game.defaultBet,
    roundsPlayed,
    lastRound,
    bonus: bonusClaimed ? 'claimed' : bonusOffered ? 'offered' : 'none',
  }
}

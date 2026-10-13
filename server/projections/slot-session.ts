import type { HandlerDeps } from '../generics'
import type { GameId, RoundId } from '../structs'
import { DEMO_STARTING_BALANCE, findGameOfType } from '../games'
import { bonusStatus } from './shared/bonus-status'

export type LastRound = {
  roundId: RoundId
  bet: number
  reels: readonly string[]
  win: number
}

/** The visitor's slot session in one game: balance, bet, last round, bonus */
export async function slotSession(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGameOfType(payload.gameId, 'slot')

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const { events } = await deps.eventStore.read([
    ['bet_changed', filter],
    ['round_played', filter],
    ['bonus_offered', filter],
    ['bonus_claimed', filter],
  ])

  // Events arrive newest first
  let bet: number | undefined
  let balance: number | undefined
  let lastRound: LastRound | null = null
  let roundsPlayed = 0

  for (const event of events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'round_played': {
        roundsPlayed++
        balance ??= event.balanceAfter
        lastRound ??= {
          roundId: event.roundId,
          bet: event.bet,
          reels: event.reels,
          win: event.win,
        }
        break
      }
    }
  }

  return {
    success: true,
    data: {
      game,
      balance: balance ?? DEMO_STARTING_BALANCE,
      bet: bet ?? game.defaultBet,
      roundsPlayed,
      lastRound,
      bonus: bonusStatus(events),
    },
  } as const
}

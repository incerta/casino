import type { HandlerDeps } from '../generics'
import type { DiceDirection, GameId, RollId } from '../structs'
import { DEMO_STARTING_BALANCE, findGameOfType } from '../games'
import { bonusStatus } from './shared/bonus-status'

const HISTORY_LENGTH = 12

export type DiceRoll = {
  rollId: RollId
  bet: number
  target: number
  direction: DiceDirection
  roll: number
  multiplier: number
  win: number
}

/** The visitor's Neon Dice session: balance, bet, recent rolls, bonus */
export async function diceSession(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGameOfType(payload.gameId, 'dice')

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const { events } = await deps.eventStore.read([
    ['bet_changed', filter],
    ['dice_rolled', filter],
    ['bonus_offered', filter],
    ['bonus_claimed', filter],
  ])

  // Events arrive newest first
  let bet: number | undefined
  let balance: number | undefined
  let roundsPlayed = 0
  const history: DiceRoll[] = []

  for (const event of events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'dice_rolled': {
        roundsPlayed++
        balance ??= event.balanceAfter
        if (history.length < HISTORY_LENGTH) {
          history.push({
            rollId: event.rollId,
            bet: event.bet,
            target: event.target,
            direction: event.direction,
            roll: event.roll,
            multiplier: event.multiplier,
            win: event.win,
          })
        }
        break
      }
    }
  }

  const lastRoll = history.at(0) ?? null

  return {
    success: true,
    data: {
      game,
      balance: balance ?? DEMO_STARTING_BALANCE,
      bet: bet ?? game.defaultBet,
      roundsPlayed,
      lastRoll,
      /** Newest first */
      history,
      bonus: bonusStatus(events),
    },
  } as const
}

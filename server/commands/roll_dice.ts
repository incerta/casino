import { createId } from '@paralleldrive/cuid2'
import type { CommandId, DiceDirection, GameId, RollId } from '../structs'
import type { HandlerDeps } from '../generics'
import {
  BONUS_ROUND_THRESHOLD,
  DEMO_STARTING_BALANCE,
  findGameOfType,
} from '../games'
import { diceMultiplier, isDiceWin, rollDie } from '../dice-engine'
import type { Random } from '../slot-engine'

/**
 * Rolls the die server side with the visitor's current bet. The outcome is
 * decided here and persisted in `dice_rolled`; the client reads it back
 * through the `diceSession` projection.
 */
export async function rollDice(
  deps: HandlerDeps<{ random?: Random }>,
  payload: { gameId: GameId; target: number; direction: DiceDirection }
) {
  const game = findGameOfType(payload.gameId, 'dice')

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  if (
    Number.isInteger(payload.target) === false ||
    payload.target < game.minTarget ||
    payload.target > game.maxTarget ||
    (payload.direction !== 'over' && payload.direction !== 'under')
  ) {
    return { success: false, reason: 'invalid-target' } as const
  }

  // Consistency boundary: exactly the facts this decision depends on.
  // Keep it inline; changing it changes which concurrent writes conflict.
  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const queryResult = await deps.eventStore.read([
    ['bet_changed', filter],
    ['dice_rolled', filter],
    ['bonus_offered', filter],
  ])

  // Events arrive newest first
  let bet: number | undefined
  let balance: number | undefined
  let rollsPlayed = 0
  let bonusOffered = false

  for (const event of queryResult.events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'dice_rolled': {
        balance ??= event.balanceAfter
        rollsPlayed++
        break
      }
      case 'bonus_offered': {
        bonusOffered = true
        break
      }
    }
  }

  const session = {
    bet: bet ?? game.defaultBet,
    balance: balance ?? DEMO_STARTING_BALANCE,
    rollsPlayed,
    bonusOffered,
  }

  if (session.balance < session.bet) {
    return { success: false, reason: 'insufficient-demo-balance' } as const
  }

  const { target, direction } = payload
  const roll = rollDie(game, target, direction, deps.random ?? Math.random)
  const multiplier = diceMultiplier(target, direction)
  const win = isDiceWin(roll, target, direction)
    ? Math.floor(session.bet * multiplier)
    : 0
  const balanceAfter = session.balance - session.bet + win
  const messageId = createId() as CommandId

  const offerBonus =
    session.bonusOffered === false &&
    session.rollsPlayed + 1 >= BONUS_ROUND_THRESHOLD

  const writeResult = await deps.eventStore.write(
    [
      {
        kind: 'dice_rolled',
        causationId: messageId,
        correlationId: messageId,
        visitorId: deps.visitorId,
        gameId: game.id,
        rollId: createId() as RollId,
        bet: session.bet,
        target,
        direction,
        roll,
        multiplier,
        win,
        balanceAfter,
        simulated: true,
      },
      ...(offerBonus
        ? [
            {
              kind: 'bonus_offered' as const,
              causationId: messageId,
              correlationId: messageId,
              visitorId: deps.visitorId,
              gameId: game.id,
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

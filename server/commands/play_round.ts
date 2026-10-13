import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId, RoundId } from '../structs'
import type { HandlerDeps } from '../generics'
import {
  BONUS_ROUND_THRESHOLD,
  DEMO_STARTING_BALANCE,
  findGame,
} from '../games'
import { evaluateReels, spinReels, type Random } from '../slot-engine'

/**
 * Spins the reels server side with the visitor's current bet. The outcome is
 * decided here and persisted in `round_played`; the client reads it back
 * through the `gameSession` projection.
 */
export async function playRound(
  deps: HandlerDeps<{ random?: Random }>,
  payload: { gameId: GameId }
) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  // Consistency boundary: exactly the facts this decision depends on.
  // Keep it inline; changing it changes which concurrent writes conflict.
  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const queryResult = await deps.eventStore.read([
    ['bet_changed', filter],
    ['round_played', filter],
    ['bonus_offered', filter],
  ])

  // Events arrive newest first
  let bet: number | undefined
  let balance: number | undefined
  let roundsPlayed = 0
  let bonusOffered = false

  for (const event of queryResult.events) {
    switch (event.kind) {
      case 'bet_changed': {
        bet ??= event.bet
        break
      }
      case 'round_played': {
        balance ??= event.balanceAfter
        roundsPlayed++
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
    roundsPlayed,
    bonusOffered,
  }

  if (session.balance < session.bet) {
    return { success: false, reason: 'insufficient-demo-balance' } as const
  }

  const reels = spinReels(game, deps.random ?? Math.random)
  const win = evaluateReels(game, reels, session.bet)
  const balanceAfter = session.balance - session.bet + win
  const roundId = createId() as RoundId
  const messageId = createId() as CommandId

  const offerBonus =
    session.bonusOffered === false &&
    session.roundsPlayed + 1 >= BONUS_ROUND_THRESHOLD

  const writeResult = await deps.eventStore.write(
    [
      {
        kind: 'round_played',
        causationId: messageId,
        correlationId: messageId,
        visitorId: deps.visitorId,
        gameId: game.id,
        roundId,
        bet: session.bet,
        reels,
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

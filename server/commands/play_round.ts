import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId, RoundId } from '../structs'
import type { HandlerDeps } from '../generics'
import { BONUS_ROUND_THRESHOLD, findGame } from '../games'
import { foldGameSession, readGameSessionEvents } from '../game-session-state'
import { evaluateReels, spinReels, type Random } from '../slot-engine'

/**
 * Spins the reels server side with the visitor's current bet. The outcome is
 * decided here and persisted in `round_played`; the client only renders it.
 */
export async function playRound(
  deps: HandlerDeps<{ random?: Random }>,
  payload: { gameId: GameId }
) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const queryResult = await readGameSessionEvents(deps, game.id)
  const session = foldGameSession(game, queryResult.events)

  if (session.balance < session.bet) {
    return { success: false, reason: 'insufficient-demo-balance' } as const
  }

  const reels = spinReels(game, deps.random ?? Math.random)
  const win = evaluateReels(game, reels, session.bet)
  const balanceAfter = session.balance - session.bet + win
  const roundId = createId() as RoundId
  const messageId = createId() as CommandId

  const offerBonus =
    session.bonus === 'none' &&
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

  return {
    success: true,
    data: { roundId, reels, win, balanceAfter, bonusOffered: offerBonus },
  } as const
}

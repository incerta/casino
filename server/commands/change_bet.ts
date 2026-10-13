import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId } from '../structs'
import type { HandlerDeps } from '../generics'
import { findGame } from '../games'

export async function changeBet(
  deps: HandlerDeps,
  payload: { gameId: GameId; bet: number }
) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  if (game.bets.includes(payload.bet) === false) {
    return { success: false, reason: 'bet-not-allowed' } as const
  }

  const messageId = createId() as CommandId
  const writeResult = await deps.eventStore.write([
    {
      kind: 'bet_changed',
      causationId: messageId,
      correlationId: messageId,
      visitorId: deps.visitorId,
      gameId: game.id,
      bet: payload.bet,
    },
  ])

  if (writeResult.success === false) {
    return writeResult
  }

  return { success: true } as const
}

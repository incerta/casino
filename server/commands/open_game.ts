import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId } from '../structs'
import type { HandlerDeps } from '../generics'
import { findGame } from '../games'

export async function openGame(deps: HandlerDeps, payload: { gameId: GameId }) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const messageId = createId() as CommandId
  const writeResult = await deps.eventStore.write([
    {
      kind: 'game_opened',
      causationId: messageId,
      correlationId: messageId,
      visitorId: deps.visitorId,
      gameId: game.id,
    },
  ])

  if (writeResult.success === false) {
    return writeResult
  }

  return { success: true } as const
}

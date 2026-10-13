import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId } from '../structs'
import type { HandlerDeps } from '../generics'
import { findGame } from '../games'

export async function claimBonus(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  // Consistency boundary: only the bonus lifecycle of this visitor and game.
  // Keep it inline; changing it changes which concurrent writes conflict.
  const filter = { visitorId: deps.visitorId, gameId: game.id }
  const queryResult = await deps.eventStore.read([
    ['bonus_offered', filter],
    ['bonus_claimed', filter],
  ])

  const offered = queryResult.events.some(
    (event) => event.kind === 'bonus_offered'
  )
  const claimed = queryResult.events.some(
    (event) => event.kind === 'bonus_claimed'
  )

  if (offered === false) {
    return { success: false, reason: 'bonus-not-offered' } as const
  }

  if (claimed) {
    return { success: false, reason: 'bonus-already-claimed' } as const
  }

  const messageId = createId() as CommandId
  const writeResult = await deps.eventStore.write(
    [
      {
        kind: 'bonus_claimed',
        causationId: messageId,
        correlationId: messageId,
        visitorId: deps.visitorId,
        gameId: game.id,
      },
    ],
    queryResult.dcb
  )

  if (writeResult.success === false) {
    return writeResult
  }

  return { success: true } as const
}

import { createId } from '@paralleldrive/cuid2'
import type { CommandId, GameId } from '../structs'
import type { HandlerDeps } from '../generics'
import { findGame } from '../games'
import { foldGameSession, readGameSessionEvents } from '../game-session-state'

export async function claimBonus(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const queryResult = await readGameSessionEvents(deps, game.id)
  const session = foldGameSession(game, queryResult.events)

  if (session.bonus === 'none') {
    return { success: false, reason: 'bonus-not-offered' } as const
  }

  if (session.bonus === 'claimed') {
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

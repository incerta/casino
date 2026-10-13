import type { HandlerDeps } from '../generics'
import type { GameId } from '../structs'
import { findGame } from '../games'
import { foldGameSession, readGameSessionEvents } from '../game-session-state'

/** The visitor's demo session in one game: balance, bet, last round, bonus */
export async function gameSession(
  deps: HandlerDeps,
  payload: { gameId: GameId }
) {
  const game = findGame(payload.gameId)

  if (game === undefined) {
    return { success: false, reason: 'game-not-found' } as const
  }

  const { events } = await readGameSessionEvents(deps, game.id)

  return {
    success: true,
    data: { game, ...foldGameSession(game, events) },
  } as const
}

import type { PublicHandlerDeps } from '../generics'
import { GAMES } from '../games'

/** Game catalog shown in the lobby */
export async function games(_deps: PublicHandlerDeps) {
  return { success: true, data: GAMES } as const
}

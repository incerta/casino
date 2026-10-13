import { object, literal } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId } from '../structs'

export const gameOpened = object({
  ...STORE_EVENT_SHARED,
  kind: literal('game_opened'),
  visitorId,
  gameId,
})

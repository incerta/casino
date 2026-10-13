import { object, literal, number } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId } from '../structs'

export const betChanged = object({
  ...STORE_EVENT_SHARED,
  kind: literal('bet_changed'),
  visitorId,
  gameId,
  bet: number().min(1),
})

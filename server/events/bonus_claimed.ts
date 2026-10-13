import { object, literal } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId } from '../structs'

export const bonusClaimed = object({
  ...STORE_EVENT_SHARED,
  kind: literal('bonus_claimed'),
  visitorId,
  gameId,
})

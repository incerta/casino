import { object, literal } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId } from '../structs'

export const bonusOffered = object({
  ...STORE_EVENT_SHARED,
  kind: literal('bonus_offered'),
  visitorId,
  gameId,
  /** The bonus is part of the test environment and carries no real value */
  simulated: literal(true),
})

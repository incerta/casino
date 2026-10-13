import { object, literal, number, string, array } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId, roundId } from '../structs'

export const roundPlayed = object({
  ...STORE_EVENT_SHARED,
  kind: literal('round_played'),
  visitorId,
  gameId,
  roundId,
  bet: number().min(1),
  reels: array(string()),
  win: number().min(0),
  balanceAfter: number(),
  /** Demo rounds use biased outcomes and demo credits, never real money */
  simulated: literal(true),
})

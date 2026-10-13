import { object, literal, number } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId, runId } from '../structs'

export const roadRunCashedOut = object({
  ...STORE_EVENT_SHARED,
  kind: literal('road_run_cashed_out'),
  visitorId,
  gameId,
  runId,
  /** Last lane crossed before cashing out */
  lane: number().min(1),
  multiplier: number().min(0),
  win: number().min(0),
  balanceAfter: number(),
  /** Demo runs use biased outcomes and demo credits, never real money */
  simulated: literal(true),
})

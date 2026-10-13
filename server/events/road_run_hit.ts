import { object, literal, number } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId, runId } from '../structs'

export const roadRunHit = object({
  ...STORE_EVENT_SHARED,
  kind: literal('road_run_hit'),
  visitorId,
  gameId,
  runId,
  /** 1-based lane where the chicken was hit; the run ends without payout */
  lane: number().min(1),
  /** Demo runs use biased outcomes and demo credits, never real money */
  simulated: literal(true),
})

import { object, literal, number } from 'schematox'
import { STORE_EVENT_SHARED, visitorId, gameId, runId } from '../structs'

export const roadLaneCrossed = object({
  ...STORE_EVENT_SHARED,
  kind: literal('road_lane_crossed'),
  visitorId,
  gameId,
  runId,
  /** 1-based lane the chicken has just crossed */
  lane: number().min(1),
  /** Payout multiplier reached by crossing this lane */
  multiplier: number().min(0),
})

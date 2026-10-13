import { object, literal, number } from 'schematox'
import {
  STORE_EVENT_SHARED,
  visitorId,
  gameId,
  runId,
  roadDifficulty,
} from '../structs'

export const roadRunStarted = object({
  ...STORE_EVENT_SHARED,
  kind: literal('road_run_started'),
  visitorId,
  gameId,
  runId,
  bet: number().min(1),
  difficulty: roadDifficulty,
  /** The bet is deducted when the run starts */
  balanceAfter: number(),
})

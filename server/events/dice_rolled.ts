import { object, literal, number } from 'schematox'
import {
  STORE_EVENT_SHARED,
  visitorId,
  gameId,
  rollId,
  diceDirection,
} from '../structs'

export const diceRolled = object({
  ...STORE_EVENT_SHARED,
  kind: literal('dice_rolled'),
  visitorId,
  gameId,
  rollId,
  bet: number().min(1),
  /** Whole percent the roll is compared against */
  target: number().min(1).max(99),
  direction: diceDirection,
  /** 0..9999, shown as 00.00..99.99 */
  roll: number().min(0).max(9999),
  multiplier: number().min(0),
  win: number().min(0),
  balanceAfter: number(),
  /** Demo rolls use biased outcomes and demo credits, never real money */
  simulated: literal(true),
})

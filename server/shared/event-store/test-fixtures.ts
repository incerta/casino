import { object, literal, string, number, boolean, array } from 'schematox'
import type { Infer } from 'schematox'
import { STORE_EVENT_SHARED } from '../../structs'

// Synthetic event kinds covering every field type Filter<T> supports
// (number/string/boolean/array), since the one real domain schema
// (game_opened) has no boolean/array field to exercise
// $all or boolean $exists against.

export type TestAlpha = Infer<typeof testAlpha>
export const testAlpha = object({
  ...STORE_EVENT_SHARED,
  kind: literal('test_alpha'),
  actorId: number(),
  count: number(),
  label: string(),
  active: boolean(),
  tags: array(string()),
})

export type TestBeta = Infer<typeof testBeta>
export const testBeta = object({
  ...STORE_EVENT_SHARED,
  kind: literal('test_beta'),
  actorId: number(),
  amount: number(),
})

export type TestEvent = TestAlpha | TestBeta

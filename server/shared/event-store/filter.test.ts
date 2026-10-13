import { describe, test, expect } from 'vitest'
import { matchesFilter } from './filter'
import type { Filter } from './types'

type Sample = {
  id: number
  kind: string
  count: number
  label: string
  active: boolean
  tags: string[]
}

const record: Sample = {
  id: 1,
  kind: 'sample',
  count: 5,
  label: 'shoes',
  active: true,
  tags: ['a', 'b'],
}

function matches(filter: Filter<Sample>): boolean {
  return matchesFilter(record, filter)
}

describe('$eq', () => {
  test('explicit form matches', () => {
    expect(matches({ label: { $eq: 'shoes' } })).toBe(true)
  })

  test('explicit form rejects mismatch', () => {
    expect(matches({ label: { $eq: 'boots' } })).toBe(false)
  })

  test('bare-value shorthand matches', () => {
    expect(matches({ label: 'shoes' })).toBe(true)
  })

  test('bare-value shorthand rejects mismatch', () => {
    expect(matches({ count: 999 })).toBe(false)
  })

  test('bare array shorthand matches exact array', () => {
    expect(matches({ tags: ['a', 'b'] })).toBe(true)
  })

  test('bare array shorthand rejects different order', () => {
    expect(matches({ tags: ['b', 'a'] })).toBe(false)
  })
})

describe('$ne', () => {
  test('matches when different', () => {
    expect(matches({ label: { $ne: 'boots' } })).toBe(true)
  })

  test('rejects when equal', () => {
    expect(matches({ label: { $ne: 'shoes' } })).toBe(false)
  })
})

describe('$in', () => {
  test('matches when value present', () => {
    expect(matches({ label: { $in: ['boots', 'shoes'] } })).toBe(true)
  })

  test('rejects when value absent', () => {
    expect(matches({ label: { $in: ['boots'] } })).toBe(false)
  })

  test('rejects on empty array', () => {
    expect(matches({ label: { $in: [] } })).toBe(false)
  })
})

describe('$exists', () => {
  test('true matches a present field', () => {
    expect(matches({ label: { $exists: true } })).toBe(true)
  })

  test('false rejects a present field', () => {
    expect(matches({ label: { $exists: false } })).toBe(false)
  })
})

describe('numeric comparisons', () => {
  test('$gt boundary', () => {
    expect(matches({ count: { $gt: 4 } })).toBe(true)
    expect(matches({ count: { $gt: 5 } })).toBe(false)
  })

  test('$gte boundary', () => {
    expect(matches({ count: { $gte: 5 } })).toBe(true)
    expect(matches({ count: { $gte: 6 } })).toBe(false)
  })

  test('$lt boundary', () => {
    expect(matches({ count: { $lt: 6 } })).toBe(true)
    expect(matches({ count: { $lt: 5 } })).toBe(false)
  })

  test('$lte boundary', () => {
    expect(matches({ count: { $lte: 5 } })).toBe(true)
    expect(matches({ count: { $lte: 4 } })).toBe(false)
  })

  test('combined $gte + $lte range', () => {
    expect(matches({ count: { $gte: 1, $lte: 10 } })).toBe(true)
    expect(matches({ count: { $gte: 6, $lte: 10 } })).toBe(false)
  })
})

describe('$all', () => {
  test('matches a subset', () => {
    expect(matches({ tags: { $all: ['a'] } })).toBe(true)
  })

  test('matches the exact set', () => {
    expect(matches({ tags: { $all: ['a', 'b'] } })).toBe(true)
  })

  test('rejects a tag not present', () => {
    expect(matches({ tags: { $all: ['c'] } })).toBe(false)
  })

  test('matches on empty $all', () => {
    expect(matches({ tags: { $all: [] } })).toBe(true)
  })
})

describe('logical composition', () => {
  test('$and: all true', () => {
    expect(matches({ $and: [{ label: 'shoes' }, { count: 5 }] })).toBe(true)
  })

  test('$and: one false', () => {
    expect(matches({ $and: [{ label: 'shoes' }, { count: 999 }] })).toBe(false)
  })

  test('$or: one true', () => {
    expect(matches({ $or: [{ label: 'boots' }, { count: 5 }] })).toBe(true)
  })

  test('$or: none true', () => {
    expect(matches({ $or: [{ label: 'boots' }, { count: 999 }] })).toBe(false)
  })

  test('$not wrapping a plain field map', () => {
    expect(matches({ $not: { label: 'boots' } })).toBe(true)
    expect(matches({ $not: { label: 'shoes' } })).toBe(false)
  })

  test('$not wrapping an operator object at field level', () => {
    expect(matches({ label: { $not: { $eq: 'boots' } } })).toBe(true)
    expect(matches({ label: { $not: { $eq: 'shoes' } } })).toBe(false)
  })

  test('nested $not($or(...))', () => {
    expect(
      matches({ $not: { $or: [{ label: 'boots' }, { count: 999 }] } })
    ).toBe(true)
    expect(
      matches({ $not: { $or: [{ label: 'shoes' }, { count: 999 }] } })
    ).toBe(false)
  })

  test('top-level multi-field is an implicit AND', () => {
    expect(matches({ label: 'shoes', count: 5 })).toBe(true)
    expect(matches({ label: 'shoes', count: 999 })).toBe(false)
  })

  test('field-level Logical combined with top-level Logical', () => {
    expect(
      matches({ $and: [{ label: { $ne: 'boots' } }, { active: true }] })
    ).toBe(true)
  })
})

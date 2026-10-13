import { describe, test, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { initEventStore } from './init-event-store'
import { DEFAULT_DB_ROOT } from './fs-store'
import { env } from '../../config'
import {
  testAlpha,
  testBeta,
  type TestAlpha,
  type TestBeta,
} from './test-fixtures'
import { gameOpened } from '../../events/game_opened'

type AlphaOverrides = Partial<Omit<TestAlpha, 'id'>> & { id: number }
type BetaOverrides = Partial<Omit<TestBeta, 'id'>> & { id: number }

function alpha(overrides: AlphaOverrides): TestAlpha {
  return {
    kind: 'test_alpha',
    correlationId: overrides.id,
    causationId: overrides.id,
    issuedAt: 1700000000000,
    actorId: 1,
    count: 0,
    label: '',
    active: false,
    tags: [],
    ...overrides,
  } as unknown as TestAlpha
}

function beta(overrides: BetaOverrides): TestBeta {
  return {
    kind: 'test_beta',
    correlationId: overrides.id,
    causationId: overrides.id,
    issuedAt: 1700000000000,
    actorId: 1,
    amount: 0,
    ...overrides,
  } as unknown as TestBeta
}

function alphaInput(
  overrides: Partial<Omit<TestAlpha, 'id' | 'issuedAt'>> = {}
): Omit<TestAlpha, 'id' | 'issuedAt'> {
  return {
    kind: 'test_alpha',
    correlationId: 1,
    causationId: 1,
    actorId: 1,
    count: 0,
    label: '',
    active: false,
    tags: [],
    ...overrides,
  } as unknown as Omit<TestAlpha, 'id' | 'issuedAt'>
}

function betaInput(
  overrides: Partial<Omit<TestBeta, 'id' | 'issuedAt'>> = {}
): Omit<TestBeta, 'id' | 'issuedAt'> {
  return {
    kind: 'test_beta',
    correlationId: 1,
    causationId: 1,
    actorId: 1,
    amount: 0,
    ...overrides,
  } as unknown as Omit<TestBeta, 'id' | 'issuedAt'>
}

describe('initEventStore — init', () => {
  test('empty init with no seed yields an empty store', async () => {
    const store = await initEventStore([testAlpha, testBeta])
    const { events, dcb } = await store.read([['test_alpha', {}]])
    expect(events).toEqual([])
    expect(dcb.after).toBe(0)
  })

  test('seeded init becomes the exact initial state, ids as given', async () => {
    const seed = [alpha({ id: 1 }), beta({ id: 2 }), alpha({ id: 3 })]
    const store = await initEventStore([testAlpha, testBeta], seed)

    const alphaRead = await store.read([['test_alpha', {}]])
    expect(alphaRead.events.map((e) => e.id)).toEqual([3, 1])

    const betaRead = await store.read([['test_beta', {}]])
    expect(betaRead.events.map((e) => e.id)).toEqual([2])

    const onDisk = JSON.parse(
      await readFile(
        path.join(DEFAULT_DB_ROOT, env.NODE_ENV, 'test_alpha', '1.json'),
        'utf8'
      )
    )
    expect(onDisk.id).toBe(1)
  })

  test('re-init in test mode flushes prior state before applying new seed', async () => {
    await initEventStore([testAlpha], [alpha({ id: 1 })])
    const store2 = await initEventStore([testAlpha], [alpha({ id: 99 })])
    const { events } = await store2.read([['test_alpha', {}]])
    expect(events.map((e) => e.id)).toEqual([99])
  })
})

describe('initEventStore — read', () => {
  test('applies field filters against seeded data', async () => {
    const store = await initEventStore(
      [testAlpha],
      [
        alpha({ id: 1, label: 'shoes', count: 5 }),
        alpha({ id: 2, label: 'boots', count: 10 }),
      ]
    )
    const shoes = await store.read([['test_alpha', { label: 'shoes' }]])
    expect(shoes.events.map((e) => e.id)).toEqual([1])

    const range = await store.read([['test_alpha', { count: { $gte: 6 } }]])
    expect(range.events.map((e) => e.id)).toEqual([2])
  })

  test('per-entry limit keeps the most recent matches', async () => {
    const seed = [1, 2, 3, 4].map((id) => alpha({ id, label: 'x' }))
    const store = await initEventStore([testAlpha], seed)
    const { events } = await store.read([
      ['test_alpha', { label: 'x' }, { limit: 2 }],
    ])
    expect(events.map((e) => e.id)).toEqual([4, 3])
  })

  test('multi-kind query merges results in global DESC order', async () => {
    const seed = [alpha({ id: 1 }), beta({ id: 2 }), alpha({ id: 3 })]
    const store = await initEventStore([testAlpha, testBeta], seed)
    const { events } = await store.read([
      ['test_alpha', {}],
      ['test_beta', {}],
    ])
    expect(events.map((e) => e.id)).toEqual([3, 2, 1])
  })

  test('empty-result read still returns the store-wide after watermark', async () => {
    const store = await initEventStore([testAlpha], [alpha({ id: 5 })])
    const { events, dcb } = await store.read([
      ['test_alpha', { label: 'nope' }],
    ])
    expect(events).toEqual([])
    expect(dcb.after).toBe(5)
  })
})

describe('initEventStore — write', () => {
  test('write without dcb assigns id/issuedAt and is immediately visible', async () => {
    const store = await initEventStore([testAlpha])
    const result = await store.write([alphaInput({ label: 'x' })])

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data[0].id).toBe(1)
    expect(typeof result.data[0].issuedAt).toBe('number')

    const { events } = await store.read([['test_alpha', {}]])
    expect(events).toHaveLength(1)

    const onDisk = JSON.parse(
      await readFile(
        path.join(DEFAULT_DB_ROOT, env.NODE_ENV, 'test_alpha', '1.json'),
        'utf8'
      )
    )
    expect(onDisk.label).toBe('x')
  })

  test('a multi-event batch gets sequential ids and one shared issuedAt', async () => {
    const store = await initEventStore([testAlpha])
    const result = await store.write([
      alphaInput({ label: 'a' }),
      alphaInput({ label: 'b' }),
    ])

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data[1].id - result.data[0].id).toBe(1)
    expect(result.data[0].issuedAt).toBe(result.data[1].issuedAt)
  })

  test('an invalid event is rejected without partial commit', async () => {
    const store = await initEventStore([testAlpha])
    const result = await store.write([
      alphaInput({ label: 'valid' }),
      { ...alphaInput(), count: 'not-a-number' } as unknown as Omit<
        TestAlpha,
        'id' | 'issuedAt'
      >,
    ])

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe('invalid')

    const { events } = await store.read([['test_alpha', {}]])
    expect(events).toEqual([])
  })

  test('writing an unregistered kind throws', async () => {
    const store = await initEventStore([testAlpha])
    await expect(
      store.write([
        {
          kind: 'nonexistent_kind',
          correlationId: 1,
          causationId: 1,
        } as unknown as Omit<TestAlpha, 'id' | 'issuedAt'>,
      ])
    ).rejects.toThrow(/Unknown event kind/)
  })

  test('concurrent write() calls serialize with unique sequential ids', async () => {
    const store = await initEventStore([testAlpha])
    const results = await Promise.all([
      store.write([alphaInput({ label: 'a' })]),
      store.write([alphaInput({ label: 'b' })]),
      store.write([alphaInput({ label: 'c' })]),
    ])
    const ids = results.flatMap((r) =>
      r.success ? r.data.map((d) => d.id) : []
    )
    expect(new Set(ids).size).toBe(3)
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3])
  })
})

describe('initEventStore — DCB writes', () => {
  test('succeeds when the append condition has no matches', async () => {
    const store = await initEventStore([testAlpha])
    const { dcb } = await store.read([['test_alpha', { label: 'shoes' }]])

    const result = await store.write([alphaInput({ label: 'shoes' })], dcb)

    expect(result.success).toBe(true)
  })

  test('rejects a genuine conflict and mutates nothing', async () => {
    const store = await initEventStore([testAlpha])
    const { dcb } = await store.read([['test_alpha', { label: 'shoes' }]])

    await store.write([alphaInput({ label: 'shoes' })])

    const result = await store.write([alphaInput({ label: 'shoes' })], dcb)

    expect(result).toEqual({ success: false, reason: 'conflict' })

    const { events } = await store.read([['test_alpha', { label: 'shoes' }]])
    expect(events).toHaveLength(1)
  })

  test('succeeds despite an unrelated event past after (no false conflict)', async () => {
    const store = await initEventStore([testAlpha, testBeta])
    const { dcb } = await store.read([['test_alpha', { label: 'shoes' }]])

    await store.write([betaInput({ amount: 1 })])

    const result = await store.write([alphaInput({ label: 'shoes' })], dcb)

    expect(result.success).toBe(true)
  })
})

describe('initEventStore — real schema smoke test', () => {
  test('works end-to-end against the real gameOpened schema', async () => {
    const store = await initEventStore([gameOpened])

    const result = await store.write([
      {
        kind: 'game_opened',
        correlationId: 1,
        causationId: 1,
        visitorId: 'visitor-1',
        gameId: 'lucky-sevens',
      } as unknown as Omit<
        import('schematox').Infer<typeof gameOpened>,
        'id' | 'issuedAt'
      >,
    ])

    expect(result.success).toBe(true)

    const { events } = await store.read([
      ['game_opened', { gameId: 'lucky-sevens' as never }],
    ])
    expect(events).toHaveLength(1)
  })
})

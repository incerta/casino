import { describe, test, expect } from 'vitest'
import { createId } from '@paralleldrive/cuid2'

import { initStore } from '../event-store'
import { playRound } from './play_round'
import type { Random } from '../slot-engine'
import type { GameId, MessageId, VisitorId } from '../structs'

const visitorId = 'visitor-0001' as VisitorId
const gameId = 'lucky-sevens' as GameId

function sequence(values: number[]): Random {
  let index = 0
  return () => values[index++ % values.length]!
}

describe('playRound', () => {
  test('pays a forced demo win and records it in round_played', async () => {
    const store = await initStore()

    const result = await playRound(
      { eventStore: store, visitorId, random: () => 0 },
      { gameId }
    )

    expect(result).toEqual({ success: true })

    const { events } = await store.read([
      ['round_played', { visitorId, gameId }],
    ])
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      bet: 10,
      reels: ['seven', 'seven', 'seven'],
      win: 200,
      balanceAfter: 1190,
      simulated: true,
    })
  })

  test('deducts the bet on a losing spin', async () => {
    const store = await initStore()

    await playRound(
      { eventStore: store, visitorId, random: sequence([0, 0.25, 0.5, 0.99]) },
      { gameId }
    )

    const { events } = await store.read([
      ['round_played', { visitorId, gameId }],
    ])
    expect(events[0]).toMatchObject({
      reels: ['seven', 'bell', 'bar'],
      win: 0,
      balanceAfter: 990,
    })
  })

  test('uses the bet from the latest bet_changed event', async () => {
    const store = await initStore()

    await store.write([
      {
        kind: 'bet_changed',
        correlationId: createId() as MessageId,
        causationId: createId() as MessageId,
        visitorId,
        gameId,
        bet: 50,
      },
    ])

    await playRound(
      { eventStore: store, visitorId, random: sequence([0, 0.25, 0.5, 0.99]) },
      { gameId }
    )

    const { events } = await store.read([
      ['round_played', { visitorId, gameId }],
    ])
    expect(events[0]).toMatchObject({ bet: 50, balanceAfter: 950 })
  })

  test('offers the simulated bonus once, after the second round', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: () => 0 }

    await playRound(deps, { gameId })
    const afterFirst = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterFirst.events).toHaveLength(0)

    await playRound(deps, { gameId })
    const afterSecond = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterSecond.events).toHaveLength(1)
    expect(afterSecond.events[0]).toMatchObject({ simulated: true })

    await playRound(deps, { gameId })
    const afterThird = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterThird.events).toHaveLength(1)
  })

  test('rejects one of two concurrent spins with a conflict', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: () => 0 }

    const results = await Promise.all([
      playRound(deps, { gameId }),
      playRound(deps, { gameId }),
    ])

    expect(results.map((result) => result.success).sort()).toEqual([
      false,
      true,
    ])
    expect(results).toContainEqual({ success: false, reason: 'conflict' })
  })

  test('rejects an unknown game', async () => {
    const store = await initStore()

    const result = await playRound(
      { eventStore: store, visitorId },
      { gameId: 'missing' as GameId }
    )

    expect(result).toEqual({ success: false, reason: 'game-not-found' })
  })
})

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
  test('pays a forced demo win and updates the demo balance', async () => {
    const store = await initStore()

    const result = await playRound(
      { eventStore: store, visitorId, random: () => 0 },
      { gameId }
    )

    expect(result).toMatchObject({
      success: true,
      data: {
        reels: ['seven', 'seven', 'seven'],
        win: 200,
        balanceAfter: 1190,
        bonusOffered: false,
      },
    })
  })

  test('deducts the bet on a losing spin', async () => {
    const store = await initStore()

    const result = await playRound(
      { eventStore: store, visitorId, random: sequence([0, 0.25, 0.5, 0.99]) },
      { gameId }
    )

    expect(result).toMatchObject({
      success: true,
      data: { reels: ['seven', 'bell', 'bar'], win: 0, balanceAfter: 990 },
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

    const result = await playRound(
      { eventStore: store, visitorId, random: sequence([0, 0.25, 0.5, 0.99]) },
      { gameId }
    )

    expect(result).toMatchObject({ success: true, data: { balanceAfter: 950 } })
  })

  test('offers the simulated bonus once, after the second round', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: () => 0 }

    const first = await playRound(deps, { gameId })
    const second = await playRound(deps, { gameId })
    const third = await playRound(deps, { gameId })

    expect(first).toMatchObject({ data: { bonusOffered: false } })
    expect(second).toMatchObject({ data: { bonusOffered: true } })
    expect(third).toMatchObject({ data: { bonusOffered: false } })

    const { events } = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(events).toHaveLength(1)
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

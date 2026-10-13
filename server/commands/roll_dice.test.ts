import { describe, test, expect } from 'vitest'
import { createId } from '@paralleldrive/cuid2'

import { initStore } from '../event-store'
import { rollDice } from './roll_dice'
import type { Random } from '../slot-engine'
import type { GameId, MessageId, VisitorId } from '../structs'

const visitorId = 'visitor-0001' as VisitorId
const gameId = 'neon-dice' as GameId

function sequence(values: number[]): Random {
  let index = 0
  return () => values[index++ % values.length]!
}

describe('rollDice', () => {
  test('pays a roll under the target and records it in dice_rolled', async () => {
    const store = await initStore()

    const result = await rollDice(
      { eventStore: store, visitorId, random: sequence([0.9, 0.1234]) },
      { gameId, target: 50, direction: 'under' }
    )

    expect(result).toEqual({ success: true })

    const { events } = await store.read([
      ['dice_rolled', { visitorId, gameId }],
    ])
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      bet: 10,
      target: 50,
      direction: 'under',
      roll: 1234,
      multiplier: 1.98,
      win: 19,
      balanceAfter: 1009,
      simulated: true,
    })
  })

  test('deducts the bet when the roll misses', async () => {
    const store = await initStore()

    await rollDice(
      { eventStore: store, visitorId, random: sequence([0.9, 0.1234]) },
      { gameId, target: 50, direction: 'over' }
    )

    const { events } = await store.read([
      ['dice_rolled', { visitorId, gameId }],
    ])
    expect(events[0]).toMatchObject({ roll: 1234, win: 0, balanceAfter: 990 })
  })

  test('forces a demo win into the winning range', async () => {
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

    await rollDice(
      { eventStore: store, visitorId, random: sequence([0, 0.5]) },
      { gameId, target: 10, direction: 'over' }
    )

    const { events } = await store.read([
      ['dice_rolled', { visitorId, gameId }],
    ])
    expect(events[0]).toMatchObject({
      bet: 50,
      roll: 5500,
      multiplier: 1.1,
      win: 55,
      balanceAfter: 1005,
    })
  })

  test('rejects a target outside the allowed range', async () => {
    const store = await initStore()

    const result = await rollDice(
      { eventStore: store, visitorId },
      { gameId, target: 99, direction: 'under' }
    )

    expect(result).toEqual({ success: false, reason: 'invalid-target' })
  })

  test('rejects a game of another type', async () => {
    const store = await initStore()

    const result = await rollDice(
      { eventStore: store, visitorId },
      { gameId: 'lucky-sevens' as GameId, target: 50, direction: 'under' }
    )

    expect(result).toEqual({ success: false, reason: 'game-not-found' })
  })

  test('offers the simulated bonus once, after the second roll', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: () => 0 }
    const payload = { gameId, target: 50, direction: 'under' } as const

    await rollDice(deps, payload)
    const afterFirst = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterFirst.events).toHaveLength(0)

    await rollDice(deps, payload)
    await rollDice(deps, payload)
    const afterThird = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterThird.events).toHaveLength(1)
  })

  test('rejects one of two concurrent rolls with a conflict', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: () => 0 }
    const payload = { gameId, target: 50, direction: 'under' } as const

    const results = await Promise.all([
      rollDice(deps, payload),
      rollDice(deps, payload),
    ])

    expect(results).toContainEqual({ success: true })
    expect(results).toContainEqual({ success: false, reason: 'conflict' })
  })
})

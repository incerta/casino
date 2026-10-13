import { describe, test, expect } from 'vitest'
import { createId } from '@paralleldrive/cuid2'

import { initStore } from '../event-store'
import { claimBonus } from './claim_bonus'
import type { GameId, MessageId, VisitorId } from '../structs'

const visitorId = 'visitor-0001' as VisitorId
const gameId = 'lucky-sevens' as GameId

describe('claimBonus', () => {
  test('claims an offered bonus', async () => {
    const store = await initStore()

    await store.write([
      {
        kind: 'bonus_offered',
        correlationId: createId() as MessageId,
        causationId: createId() as MessageId,
        visitorId,
        gameId,
        simulated: true,
      },
    ])

    const result = await claimBonus(
      { eventStore: store, visitorId },
      { gameId }
    )
    expect(result).toEqual({ success: true })

    const { events } = await store.read([
      ['bonus_claimed', { visitorId, gameId }],
    ])
    expect(events).toHaveLength(1)
  })

  test('rejects claiming a bonus that was never offered', async () => {
    const store = await initStore()

    const result = await claimBonus(
      { eventStore: store, visitorId },
      { gameId }
    )

    expect(result).toEqual({ success: false, reason: 'bonus-not-offered' })
  })

  test('rejects claiming the same bonus twice', async () => {
    const store = await initStore()

    await store.write([
      {
        kind: 'bonus_offered',
        correlationId: createId() as MessageId,
        causationId: createId() as MessageId,
        visitorId,
        gameId,
        simulated: true,
      },
    ])
    await claimBonus({ eventStore: store, visitorId }, { gameId })

    const result = await claimBonus(
      { eventStore: store, visitorId },
      { gameId }
    )

    expect(result).toEqual({ success: false, reason: 'bonus-already-claimed' })
  })

  test("does not see another visitor's bonus", async () => {
    const store = await initStore()

    await store.write([
      {
        kind: 'bonus_offered',
        correlationId: createId() as MessageId,
        causationId: createId() as MessageId,
        visitorId: 'visitor-0002' as VisitorId,
        gameId,
        simulated: true,
      },
    ])

    const result = await claimBonus(
      { eventStore: store, visitorId },
      { gameId }
    )

    expect(result).toEqual({ success: false, reason: 'bonus-not-offered' })
  })
})

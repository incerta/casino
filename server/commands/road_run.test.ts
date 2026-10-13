import { describe, test, expect } from 'vitest'

import { initStore } from '../event-store'
import { startRoadRun } from './start_road_run'
import { crossRoadLane } from './cross_road_lane'
import { cashOutRoadRun } from './cash_out_road_run'
import type { GameId, VisitorId } from '../structs'

const visitorId = 'visitor-0001' as VisitorId
const gameId = 'chicken-cross' as GameId

const neverHit = () => 0.99
const alwaysHit = () => 0

describe('Chicken Cross run', () => {
  test('starting a run deducts the bet', async () => {
    const store = await initStore()

    const result = await startRoadRun(
      { eventStore: store, visitorId },
      { gameId, difficulty: 'easy' }
    )

    expect(result).toEqual({ success: true })

    const { events } = await store.read([
      ['road_run_started', { visitorId, gameId }],
    ])
    expect(events[0]).toMatchObject({
      bet: 10,
      difficulty: 'easy',
      balanceAfter: 990,
    })
  })

  test('rejects a second run while one is in progress', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId }

    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    const result = await startRoadRun(deps, { gameId, difficulty: 'hard' })

    expect(result).toEqual({ success: false, reason: 'run-in-progress' })
  })

  test('crossing lanes and cashing out pays bet × reached multiplier', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: neverHit }

    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    await crossRoadLane(deps, { gameId })
    await crossRoadLane(deps, { gameId })
    const result = await cashOutRoadRun(deps, { gameId })

    expect(result).toEqual({ success: true })

    const crossed = await store.read([
      ['road_lane_crossed', { visitorId, gameId }],
    ])
    expect(crossed.events.map((event) => event.lane)).toEqual([2, 1])
    expect(crossed.events.map((event) => event.multiplier)).toEqual([
      1.05, 1.01,
    ])

    const cashedOut = await store.read([
      ['road_run_cashed_out', { visitorId, gameId }],
    ])
    expect(cashedOut.events[0]).toMatchObject({
      lane: 2,
      multiplier: 1.05,
      win: 10,
      balanceAfter: 1000,
      simulated: true,
    })
  })

  test('a hit ends the run without payout', async () => {
    const store = await initStore()

    await startRoadRun(
      { eventStore: store, visitorId },
      { gameId, difficulty: 'medium' }
    )
    await crossRoadLane(
      { eventStore: store, visitorId, random: alwaysHit },
      { gameId }
    )

    const { events } = await store.read([
      ['road_run_hit', { visitorId, gameId }],
      ['road_run_cashed_out', { visitorId, gameId }],
    ])
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'road_run_hit', lane: 1 })

    const cashOut = await cashOutRoadRun(
      { eventStore: store, visitorId },
      { gameId }
    )
    expect(cashOut).toEqual({ success: false, reason: 'no-active-run' })
  })

  test('cannot cash out before crossing a lane', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId }

    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    const result = await cashOutRoadRun(deps, { gameId })

    expect(result).toEqual({ success: false, reason: 'nothing-to-cash-out' })
  })

  test('crossing the final lane cashes out automatically', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: neverHit }

    await startRoadRun(deps, { gameId, difficulty: 'hardcore' })
    for (let lane = 1; lane <= 15; lane++) {
      await crossRoadLane(deps, { gameId })
    }

    const { events } = await store.read([
      ['road_run_cashed_out', { visitorId, gameId }],
    ])
    expect(events).toHaveLength(1)
    const [cashedOut] = events
    expect(cashedOut).toMatchObject({ lane: 15 })
    expect(cashedOut?.win).toBe(Math.floor(10 * cashedOut!.multiplier))
    expect(cashedOut?.balanceAfter).toBe(990 + cashedOut!.win)

    const next = await crossRoadLane(deps, { gameId })
    expect(next).toEqual({ success: false, reason: 'no-active-run' })
  })

  test('offers the simulated bonus when the second run ends', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: alwaysHit }

    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    await crossRoadLane(deps, { gameId })
    const afterFirst = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterFirst.events).toHaveLength(0)

    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    await crossRoadLane(deps, { gameId })
    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    await crossRoadLane(deps, { gameId })

    const afterThird = await store.read([
      ['bonus_offered', { visitorId, gameId }],
    ])
    expect(afterThird.events).toHaveLength(1)
  })

  test('rejects one of two concurrent crossings with a conflict', async () => {
    const store = await initStore()
    const deps = { eventStore: store, visitorId, random: neverHit }

    await startRoadRun(deps, { gameId, difficulty: 'easy' })
    const results = await Promise.all([
      crossRoadLane(deps, { gameId }),
      crossRoadLane(deps, { gameId }),
    ])

    expect(results).toContainEqual({ success: true })
    expect(results).toContainEqual({ success: false, reason: 'conflict' })
  })
})

import { describe, test, expect } from 'vitest'
import { createSerialQueue } from './serial-queue'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createSerialQueue', () => {
  test('runs tasks strictly in call order, even when an earlier task resolves later', async () => {
    const queue = createSerialQueue()
    const order: string[] = []

    const first = deferred<void>()
    const second = deferred<void>()

    // Task B is queued before task A resolves, and A's own work finishes
    // "later" than B would take on its own — proves ordering isn't
    // incidental to timing.
    const taskA = queue.run(async () => {
      order.push('A start')
      await first.promise
      order.push('A end')
    })
    const taskB = queue.run(async () => {
      order.push('B start')
      await second.promise
      order.push('B end')
    })

    // Neither task has started its body's continuation yet except A's sync
    // prefix — B must not have started at all, since A hasn't resolved.
    await Promise.resolve()
    expect(order).toEqual(['A start'])

    second.resolve()
    await Promise.resolve()
    // B still must not have started — it's queued behind A, not just
    // racing on microtasks.
    expect(order).toEqual(['A start'])

    first.resolve()
    await taskA
    await taskB

    expect(order).toEqual(['A start', 'A end', 'B start', 'B end'])
  })

  test('continues functioning after a task rejects', async () => {
    const queue = createSerialQueue()
    const order: string[] = []

    await expect(
      queue.run(async () => {
        order.push('A')
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    await queue.run(async () => {
      order.push('B')
    })

    expect(order).toEqual(['A', 'B'])
  })

  test("each run()'s promise settles with its own task's outcome", async () => {
    const queue = createSerialQueue()

    const results = await Promise.allSettled([
      queue.run(async () => 1),
      queue.run(async () => {
        throw new Error('two')
      }),
      queue.run(async () => 3),
    ])

    expect(results[0]).toEqual({ status: 'fulfilled', value: 1 })
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: expect.objectContaining({ message: 'two' }),
    })
    expect(results[2]).toEqual({ status: 'fulfilled', value: 3 })
  })
})

export type SerialQueue = {
  run: <T>(fn: () => Promise<T>) => Promise<T>
}

/**
 * FIFO async critical section. `run()` chains onto `tail` synchronously
 * before `fn` ever starts, so calls made back-to-back without awaiting
 * between them still execute in call order, one at a time.
 */
export function createSerialQueue(): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve()

  function run<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(fn, fn)
    tail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  return { run }
}

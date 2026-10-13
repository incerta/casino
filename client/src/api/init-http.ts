/**
 * Generic client-side CQRS wiring. Knows nothing about which projections or
 * commands exist — that comes entirely from the `T` type parameter, filled
 * in by the caller with the generated `ClientAPI` type — so this file has no
 * server types to keep in sync with.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const VISITOR_ID_LOCAL_STORAGE_KEY = 'IncertaCasinoVisitorId'

/**
 * Per handler id, the caller picks one of:
 * - `true`  - wire the handler up to a real request
 * - `false` - force it to resolve as manually disabled
 * - a mock function matching the handler's real client signature
 */
export type InferClientAPISignature<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? { [L in keyof T[K]]: boolean | T[K][L] }
    : never
}

export function initAPI<T extends Record<string, unknown>>(
  signature: InferClientAPISignature<T>
): T {
  return Object.entries(signature).reduce<
    Record<string, Record<string, unknown>>
  >((acc, [handlerKind, handlers]) => {
    if (acc[handlerKind] === undefined) {
      acc[handlerKind] = {}
    }

    for (const [handlerId, handlerValue] of Object.entries(
      handlers as Record<string, boolean | ((...args: unknown[]) => unknown)>
    )) {
      if (handlerValue === false) {
        acc[handlerKind][handlerId] = () =>
          Promise.reject(new Error('Handler is manually disabled'))
        continue
      }

      if (typeof handlerValue === 'function') {
        acc[handlerKind][handlerId] = handlerValue
        continue
      }

      acc[handlerKind][handlerId] = (payload: Record<string, unknown>) =>
        cqrsRequest(`${BASE_URL}/cqrs/${handlerKind}/${handlerId}`, payload)
    }

    return acc
  }, {}) as T
}

async function cqrsRequest<T>(
  url: string,
  payload: Record<string, unknown>
): Promise<T> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),

      headers: {
        'Content-Type': 'application/json',
        Authorization: getVisitorId(),
      },
    })

    if (
      res.headers.get('Content-Type')?.includes('application/json') === false
    ) {
      throw Error('Missing "application/json" Content-Type header')
    }

    if (res.ok === false) {
      throw Error(`Invalid status: ${res.status}`)
    }

    const parsedResponse = await res.json()

    if (
      typeof parsedResponse !== 'object' ||
      typeof parsedResponse.success !== 'boolean'
    ) {
      throw Error(`Invalid parsed response format`)
    }

    return parsedResponse
  } catch (error) {
    throw Error(error instanceof Error ? error.message : 'Unknown error')
  }
}

/**
 * Anonymous visitor identity until registration exists: created once per
 * browser and sent as the `Authorization` header.
 */
export function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_ID_LOCAL_STORAGE_KEY)

  if (existing !== null) return existing

  const visitorId = crypto.randomUUID()
  localStorage.setItem(VISITOR_ID_LOCAL_STORAGE_KEY, visitorId)

  return visitorId
}

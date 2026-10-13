import type { StoreEventShared, StoreEventId } from '../../structs'
import type {
  QueryTuple,
  ResultForQuery,
  QueryOptions,
  Filter,
  DynamicConsistencyBoundary,
} from './types'
import type { EventIndexes } from './indexes'
import { currentMaxId } from './indexes'
import { matchesFilter } from './filter'

type RuntimeQueryEntry<T extends StoreEventShared> = readonly [
  T['kind'],
  Filter<T>,
  QueryOptions?,
]

export function runRead<
  T extends StoreEventShared,
  U extends ReadonlyArray<T['kind']>,
>(
  indexes: EventIndexes<T>,
  query: QueryTuple<T, U>
): {
  events: Array<ResultForQuery<T, U>>
  dcb: DynamicConsistencyBoundary<T, U>
} {
  const after = currentMaxId(indexes) as StoreEventId
  const matchedById = new Map<number, T>()

  for (const [kind, filter, options] of query as ReadonlyArray<
    RuntimeQueryEntry<T>
  >) {
    const bucket = indexes.byKind[kind] ?? []
    const limit = options?.limit
    let matchCount = 0

    for (const record of bucket) {
      if (limit != null && matchCount >= limit) break
      if (!matchesFilter(record, filter)) continue
      matchedById.set(record.id, record)
      matchCount++
    }
  }

  const events = Array.from(matchedById.values()).sort((a, b) => b.id - a.id)

  return {
    events: events as Array<ResultForQuery<T, U>>,
    dcb: { after, appendCondition: query },
  }
}

export function hasConflict<
  T extends StoreEventShared,
  K extends ReadonlyArray<T['kind']>,
>(
  indexes: EventIndexes<T>,
  appendCondition: QueryTuple<T, K>,
  after: StoreEventId
): boolean {
  for (const [kind, filter] of appendCondition as ReadonlyArray<
    RuntimeQueryEntry<T>
  >) {
    const bucket = indexes.byKind[kind] ?? []
    for (const record of bucket) {
      if (record.id <= after) break // DESC bucket: rest are also <= after
      if (matchesFilter(record, filter)) return true
    }
  }
  return false
}

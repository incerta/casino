import type { StoreEventShared } from '../../structs'

export type EventIndexes<T extends StoreEventShared> = {
  /** DESC by id */
  records: T[]
  byId: Record<number, T>
  /** each bucket DESC by id; same object references as `records` */
  byKind: Partial<Record<T['kind'], T[]>>
}

export function createEmptyIndexes<
  T extends StoreEventShared,
>(): EventIndexes<T> {
  return { records: [], byId: {}, byKind: {} }
}

export function buildIndexes<T extends StoreEventShared>(
  records: T[]
): EventIndexes<T> {
  const sorted = [...records].sort((a, b) => b.id - a.id)
  const indexes = createEmptyIndexes<T>()

  for (const record of sorted) {
    indexes.records.push(record)
    indexes.byId[record.id] = record
    const bucket = indexes.byKind[record.kind as T['kind']]
    if (bucket) {
      bucket.push(record)
    } else {
      indexes.byKind[record.kind as T['kind']] = [record]
    }
  }

  return indexes
}

/**
 * `record.id` must be the new global max (assigned by the caller under the
 * write queue) so unshift-at-front keeps `records`/`byKind` DESC without a
 * re-sort.
 */
export function prependRecord<T extends StoreEventShared>(
  indexes: EventIndexes<T>,
  record: T
): void {
  indexes.records.unshift(record)
  indexes.byId[record.id] = record
  const bucket = indexes.byKind[record.kind as T['kind']]
  if (bucket) {
    bucket.unshift(record)
  } else {
    indexes.byKind[record.kind as T['kind']] = [record]
  }
}

export function currentMaxId<T extends StoreEventShared>(
  indexes: EventIndexes<T>
): number {
  return indexes.records[0]?.id ?? 0
}

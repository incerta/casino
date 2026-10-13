import type { PrettifyObject, InvalidSubject } from 'schematox'
import type { StoreEventShared, StoreEventId } from '../../structs'

export type EventStore<T extends StoreEventShared> = {
  read: EventStoreRead<T>
  write: EventStoreWrite<T>
}

export type EventStoreRead<T extends StoreEventShared> = <
  const U extends ReadonlyArray<T['kind']>,
>(
  query: QueryTuple<T, U>
) => Promise<{
  events: ReadonlyArray<ResultForQuery<T, U>>
  dcb: DynamicConsistencyBoundary<T, U>
}>

export type EventStoreWrite<T extends StoreEventShared> = <
  U extends SafeOmit<T, 'id' | 'issuedAt'>,
  const V extends ReadonlyArray<T['kind']> = never[],
>(
  events: U[],
  dcb?: DynamicConsistencyBoundary<T, V>
) => Promise<WriteResult<T, U>>

export type ResultForQuery<
  T extends StoreEventShared,
  U extends ReadonlyArray<T['kind']>,
> = DeepReadonly<Extract<T, { kind: U[number] }>>

export type WriteResult<T extends StoreEventShared, U> =
  | { success: true; data: Array<U & Pick<T, 'id' | 'issuedAt'>> } // TODO: intersection going to kill the union
  | { success: false; reason: 'conflict' }
  | {
      success: false
      reason: 'invalid'
      error: Array<Pick<InvalidSubject, 'code' | 'path'>>
    }

export type DynamicConsistencyBoundary<
  T extends StoreEventShared,
  U extends ReadonlyArray<T['kind']>,
> = {
  after: StoreEventId
  appendCondition: QueryTuple<T, U>
}

export type QueryOptions = {
  limit?: number
}

export type QueryTuple<
  T extends StoreEventShared,
  U extends ReadonlyArray<T['kind']>,
> = {
  [K in keyof U]:
    | readonly [U[K], Filter<Extract<T, { kind: U[K] }>>]
    | readonly [U[K], Filter<Extract<T, { kind: U[K] }>>, QueryOptions]
}

type StringQuery<T extends string | undefined | null> =
  { $eq: T } | { $ne: T | undefined } | { $in: T[] } | { $exists: boolean }

type NumberQuery<T extends number | undefined | null> =
  | { $eq: T }
  | { $in: T[] }
  | { $exists: boolean }
  | { $gt: number } // >
  | { $gte: number } // >=
  | { $lt: number } // <
  | { $lte: number } // <=
  | { $ne: number } // !==

type BooleanQuery<T extends boolean | undefined | null> =
  { $eq: T } | { $exists: boolean }

type ArrayQuery<T extends Array<string | number> | undefined | null> =
  T | { $eq: T } | { $all: T } | { $in: T[] }

type Logical<T> =
  | T
  | { $not: T | Logical<T> }
  | { $or: Array<T | Logical<T>> }
  | { $and: Array<T | Logical<T>> }

type FieldLevel<T> = T extends number
  ? T | Logical<NumberQuery<T>>
  : T extends string
    ? T | Logical<StringQuery<T>>
    : T extends boolean
      ? T | Logical<BooleanQuery<T>>
      : T extends Array<string | number>
        ? T | Logical<ArrayQuery<T>>
        : T

export type Filter<T> = Logical<
  Partial<{
    [K in keyof T]: FieldLevel<T[K]>
  }>
>

type SafeOmit<T extends { kind: string }, U extends string> = {
  [K in T['kind']]: PrettifyObject<Omit<Extract<T, { kind: K }>, U>>
}[T['kind']]

type DeepReadonly<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

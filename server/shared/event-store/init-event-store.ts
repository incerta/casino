import path from 'node:path'
import { env } from '../../config'
import { storeEventId } from '../../structs'
import type {
  Struct,
  ObjectSchema,
  ArraySchema,
  PrimitiveSchema,
  UnionSchema,
  Infer,
  LiteralSchema,
} from 'schematox'
import type {
  StoreEventShared,
  StoreEventId,
  timestamp,
  messageId,
} from '../../structs'
import type {
  EventStore,
  EventStoreRead,
  EventStoreWrite,
  QueryTuple,
  WriteResult,
} from './types'
import {
  createEmptyIndexes,
  buildIndexes,
  prependRecord,
  currentMaxId,
  type EventIndexes,
} from './indexes'
import { runRead, hasConflict } from './query'
import { createSerialQueue } from './serial-queue'
import {
  DEFAULT_DB_ROOT,
  scanDb,
  writeRecordFile,
  flushDb,
  type EventStruct,
} from './fs-store'

type EventFieldSchema =
  | PrimitiveSchema
  | UnionSchema<PrimitiveSchema[]>
  | ArraySchema<PrimitiveSchema>

type EventSchemaStruct = Struct<
  ObjectSchema<
    Record<string, EventFieldSchema> &
      Record<'id', typeof storeEventId.__schema> &
      Record<'correlationId', typeof messageId.__schema> &
      Record<'causationId', typeof messageId.__schema> &
      Record<'kind', LiteralSchema<string>> &
      Record<'issuedAt', typeof timestamp.__schema>
  >
>

export async function initEventStore<T extends EventSchemaStruct>(
  eventStructs: readonly T[],
  seed?: Array<Infer<T>>
): Promise<EventStore<Infer<T>>> {
  type Events = Infer<T>

  const structsByKind = buildStructsByKindMap(eventStructs)
  const dbRoot = path.join(DEFAULT_DB_ROOT, env.NODE_ENV)

  // The disposable test database is always wiped first, so every
  // initEventStore() call under NODE_ENV=test starts from a clean,
  // seed-defined slate with no leftover state from a prior run/case.
  if (env.NODE_ENV === 'test') {
    await flushDb(dbRoot)
  }

  const onDisk = await scanDb<Events>(dbRoot, structsByKind)

  let indexes: EventIndexes<Events>
  if (onDisk.length === 0 && seed && seed.length > 0) {
    // Events are sacred: seed only ever bootstraps a genuinely empty store,
    // using the ids/issuedAt the caller supplied. Once real events exist,
    // seed is silently ignored on every later call — safe to pass
    // unconditionally on app boot.
    await Promise.all(seed.map((record) => writeRecordFile(dbRoot, record)))
    indexes = buildIndexes(seed)
  } else {
    indexes =
      onDisk.length > 0 ? buildIndexes(onDisk) : createEmptyIndexes<Events>()
  }

  const queue = createSerialQueue()

  const read: EventStoreRead<Events> = (query) =>
    Promise.resolve(runRead(indexes, query))

  const write: EventStoreWrite<Events> = (events, dcb) =>
    queue.run(() => performWrite(indexes, structsByKind, dbRoot, events, dcb))

  return { read, write }
}

async function performWrite<
  T extends StoreEventShared,
  U extends Omit<T, 'id' | 'issuedAt'>,
  K extends ReadonlyArray<T['kind']> = never[],
>(
  indexes: EventIndexes<T>,
  structsByKind: Record<string, EventStruct>,
  dbRoot: string,
  events: U[],
  dcb?: { appendCondition: QueryTuple<T, K>; after: StoreEventId }
): Promise<WriteResult<T, U>> {
  if (dcb && hasConflict(indexes, dcb.appendCondition, dcb.after)) {
    return { success: false, reason: 'conflict' }
  }

  let nextId = currentMaxId(indexes) + 1
  const issuedAt = Date.now()

  const candidates = events.map(
    (event) =>
      ({
        ...event,
        id: nextId++,
        issuedAt,
      }) as unknown as T
  )

  const validated: T[] = []
  for (const candidate of candidates) {
    const struct = structsByKind[candidate.kind as string]
    if (!struct) {
      throw new Error(`Unknown event kind '${candidate.kind}'`)
    }
    const result = struct.parse(candidate)
    if (!result.success) {
      return { success: false, reason: 'invalid', error: result.error }
    }
    validated.push(result.data as T)
  }

  await Promise.all(validated.map((record) => writeRecordFile(dbRoot, record)))
  for (const record of validated) {
    prependRecord(indexes, record)
  }

  return {
    success: true,
    data: validated as unknown as Array<U & Pick<T, 'id' | 'issuedAt'>>,
  }
}

function buildStructsByKindMap(
  eventStructs: readonly EventStruct[]
): Record<string, EventStruct> {
  const map: Record<string, EventStruct> = {}

  for (const struct of eventStructs) {
    const schema = struct.__schema as { of?: Record<string, unknown> }
    const kindSchema = schema.of?.kind as
      { type?: string; of?: unknown } | undefined

    if (
      !kindSchema ||
      kindSchema.type !== 'literal' ||
      typeof kindSchema.of !== 'string'
    ) {
      throw new Error('Every event struct must have a literal `kind` field')
    }

    map[kindSchema.of] = struct
  }

  return map
}

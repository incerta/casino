import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'

import path from 'node:path'
import type { StoreEventShared } from '../../structs'
import type { ParseResult } from 'schematox'

/**
 * A structurally minimal view of a schematox `Struct<T>` — just the two
 * members this module actually uses. Using the real `EventStruct` type
 * here (Schema being schematox's full recursive schema union) makes
 * TypeScript's type-checker choke on `.parse()`'s return type with
 * "Type instantiation is excessively deep and possibly infinite" once
 * combined with this module's own generics. Any real `Struct<...>` instance
 * (e.g. `contentCategoryAdded`) structurally satisfies this without a cast.
 */
export type EventStruct = {
  __schema: Readonly<{ type: string; of?: unknown }>
  parse: (subject: unknown) => ParseResult<unknown>
}

export const DEFAULT_DB_ROOT = path.join(import.meta.dirname, '..', '..', 'db')

export function kindDir(dbRoot: string, kind: string): string {
  return path.join(dbRoot, kind)
}

export function recordPath(dbRoot: string, kind: string, id: number): string {
  return path.join(kindDir(dbRoot, kind), `${id}.json`)
}

/**
 * Refuses to overwrite an existing file at the same path — normal id
 * assignment (max+1) should never produce a collision, so this guard should
 * never fire in practice, but it turns a bug into a loud failure instead of
 * silently clobbering a persisted event.
 *
 * Uses plain `node:fs/promises` rather than `Bun.file`/`Bun.write` — this
 * module runs both under the real Bun app runtime and under vitest, whose
 * `vitest.config.ts` sets `environment: 'node'` (no `Bun` global available),
 * so it has to work identically in both.
 */
export async function writeRecordFile<T extends StoreEventShared>(
  dbRoot: string,
  record: T
): Promise<void> {
  await mkdir(kindDir(dbRoot, record.kind), { recursive: true })
  const filePath = recordPath(dbRoot, record.kind, record.id)

  if (await fileExists(filePath)) {
    throw new Error(`Refusing to overwrite existing event file: ${filePath}`)
  }

  await writeFile(filePath, JSON.stringify(record, null, 2))
}

export async function scanDb<T extends StoreEventShared>(
  dbRoot: string,
  structsByKind: Record<string, EventStruct>
): Promise<T[]> {
  let kindEntries: Array<{ name: string; isDirectory: () => boolean }>

  try {
    kindEntries = await readdir(dbRoot, { withFileTypes: true })
  } catch (error) {
    if (isMissingDirError(error)) return []
    throw error
  }

  const kindDirNames = kindEntries
    .filter((kindEntry) => kindEntry.isDirectory())
    .map((kindEntry) => kindEntry.name)

  const relativePathsByKind = await Promise.all(
    kindDirNames.map(async (kindDirName) => {
      const fileNames = await readdir(path.join(dbRoot, kindDirName))
      return fileNames
        .filter((fileName) => fileName.endsWith('.json'))
        .map((fileName) => `${kindDirName}/${fileName}`)
    })
  )

  return Promise.all(
    relativePathsByKind
      .flat()
      .map((relativePath) =>
        parseRecordFile<T>(dbRoot, relativePath, structsByKind)
      )
  )
}

export async function flushDb(dbRoot: string): Promise<void> {
  await rm(dbRoot, { recursive: true, force: true })
}

async function parseRecordFile<T extends StoreEventShared>(
  dbRoot: string,
  relativePath: string,
  structsByKind: Record<string, EventStruct>
): Promise<T> {
  const [kindDirName, fileName] = relativePath.split('/')
  const struct = structsByKind[kindDirName as string]

  if (!struct) {
    throw new Error(
      `Unregistered event kind on disk: '${kindDirName}' (${relativePath})`
    )
  }

  const raw: unknown = JSON.parse(
    await readFile(path.join(dbRoot, relativePath), 'utf8')
  )
  const result = struct.parse(raw)

  if (!result.success) {
    throw new Error(
      `Invalid event on disk at '${relativePath}': ${JSON.stringify(result.error)}`
    )
  }

  const record = result.data as T
  const expectedId = Number((fileName as string).replace(/\.json$/, ''))

  if (record.id !== expectedId) {
    throw new Error(
      `Filename/id mismatch at '${relativePath}': file says ${expectedId}, record says ${record.id}`
    )
  }

  return record
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function isMissingDirError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

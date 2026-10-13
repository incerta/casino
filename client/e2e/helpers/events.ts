import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const E2E_DB_ROOT = path.resolve(__dirname, '../../../server/db/e2e')

export type StoredEvent = {
  id: number
  kind: string
  visitorId: string
  gameId: string
  [field: string]: unknown
}

/** Events persisted by the e2e server for one visitor, oldest first */
export async function readVisitorEvents(
  visitorId: string
): Promise<StoredEvent[]> {
  const kinds = await readdir(E2E_DB_ROOT).catch(() => [])

  const events = await Promise.all(
    kinds.map(async (kind) => {
      const files = await readdir(path.join(E2E_DB_ROOT, kind))
      return Promise.all(
        files.map(
          async (file) =>
            JSON.parse(
              await readFile(path.join(E2E_DB_ROOT, kind, file), 'utf8')
            ) as StoredEvent
        )
      )
    })
  )

  return events
    .flat()
    .filter((event) => event.visitorId === visitorId)
    .sort((a, b) => a.id - b.id)
}

export async function readVisitorEventKinds(visitorId: string) {
  return (await readVisitorEvents(visitorId)).map((event) => event.kind)
}

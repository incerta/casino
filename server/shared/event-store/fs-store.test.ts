import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  kindDir,
  recordPath,
  writeRecordFile,
  scanDb,
  flushDb,
} from './fs-store'
import { testAlpha, testBeta, type TestAlpha } from './test-fixtures'

let dbRoot: string

beforeEach(async () => {
  dbRoot = await mkdtemp(path.join(tmpdir(), 'event-store-fs-test-'))
})

afterEach(async () => {
  await rm(dbRoot, { recursive: true, force: true })
})

const structsByKind = {
  test_alpha: testAlpha,
  test_beta: testBeta,
}

function makeAlpha(id: number): TestAlpha {
  return {
    id: id as TestAlpha['id'],
    kind: 'test_alpha',
    correlationId: id as TestAlpha['correlationId'],
    causationId: id as TestAlpha['causationId'],
    issuedAt: 1700000000000 as TestAlpha['issuedAt'],
    actorId: 1 as TestAlpha['actorId'],
    count: 5,
    label: 'shoes',
    active: true,
    tags: ['a'],
  }
}

describe('kindDir / recordPath', () => {
  test('builds the expected paths', () => {
    expect(kindDir('/root', 'test_alpha')).toBe(
      path.join('/root', 'test_alpha')
    )
    expect(recordPath('/root', 'test_alpha', 42)).toBe(
      path.join('/root', 'test_alpha', '42.json')
    )
  })
})

describe('writeRecordFile', () => {
  test('creates the kind directory and file from a nonexistent root', async () => {
    const record = makeAlpha(1)
    await writeRecordFile(dbRoot, record)

    const written = JSON.parse(
      await readFile(recordPath(dbRoot, 'test_alpha', 1), 'utf8')
    )
    expect(written).toEqual(record)
  })

  test('refuses to overwrite an existing file at the same path', async () => {
    const record = makeAlpha(1)
    await writeRecordFile(dbRoot, record)

    await expect(writeRecordFile(dbRoot, record)).rejects.toThrow(
      /Refusing to overwrite/
    )
  })
})

describe('scanDb', () => {
  test('round-trips what was written', async () => {
    const a = makeAlpha(1)
    const b = makeAlpha(2)
    await writeRecordFile(dbRoot, a)
    await writeRecordFile(dbRoot, b)

    const records = await scanDb(dbRoot, structsByKind)
    expect(records).toHaveLength(2)
    expect(records).toEqual(expect.arrayContaining([a, b]))
  })

  test('returns [] for a missing root', async () => {
    const missing = path.join(dbRoot, 'does-not-exist')
    expect(await scanDb(missing, structsByKind)).toEqual([])
  })

  test('returns [] for an empty root', async () => {
    expect(await scanDb(dbRoot, structsByKind)).toEqual([])
  })

  test('throws clearly on an unregistered kind directory', async () => {
    await mkdir(path.join(dbRoot, 'mystery_kind'), { recursive: true })
    await writeFile(
      path.join(dbRoot, 'mystery_kind', '1.json'),
      JSON.stringify({ id: 1 })
    )

    await expect(scanDb(dbRoot, structsByKind)).rejects.toThrow(
      /Unregistered event kind/
    )
  })

  test('throws clearly on corrupt JSON', async () => {
    await mkdir(path.join(dbRoot, 'test_alpha'), { recursive: true })
    await writeFile(path.join(dbRoot, 'test_alpha', '1.json'), '{ not json')

    await expect(scanDb(dbRoot, structsByKind)).rejects.toThrow()
  })

  test('throws clearly on filename/id mismatch', async () => {
    const record = makeAlpha(1)
    await mkdir(path.join(dbRoot, 'test_alpha'), { recursive: true })
    // filename says 2, but the record's own id field says 1
    await writeFile(
      path.join(dbRoot, 'test_alpha', '2.json'),
      JSON.stringify(record)
    )

    await expect(scanDb(dbRoot, structsByKind)).rejects.toThrow(
      /Filename\/id mismatch/
    )
  })
})

describe('flushDb', () => {
  test('removes everything under a root', async () => {
    await writeRecordFile(dbRoot, makeAlpha(1))
    expect(await scanDb(dbRoot, structsByKind)).toHaveLength(1)

    await flushDb(dbRoot)

    expect(await scanDb(dbRoot, structsByKind)).toEqual([])
  })

  test('is a no-op on an already-missing root', async () => {
    const missing = path.join(dbRoot, 'does-not-exist')
    await expect(flushDb(missing)).resolves.toBeUndefined()
  })
})

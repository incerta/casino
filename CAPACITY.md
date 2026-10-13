# Capacity estimate

**This is a sketch for a test project.** It explains where the current setup stops scaling and the cheapest way past each limit. None of it is implemented.

## Summary

The limit is the event ledger in `server/shared/event-store/`, not the API or the client. It's a home-made file store: every event is a JSON file, every event is loaded into RAM at boot, and reads scan in memory with no index.

It slows down with **total stored history**, not with concurrent players. Every read scans all events of the requested kinds across all visitors.

- Up to about **10k visitors in total** (about 500k events) it's fine for a demo.
- CPU per request is the first limit: at around 500k events, one player action costs about 60 ms of single-threaded CPU.
- RAM and boot time are the next limits.

## How the store works today

| Step   | What happens                                                                                                                          | Cost grows with                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Boot   | `scanDb` reads and validates every `db/<env>/<kind>/<id>.json`; `buildIndexes` keeps them all in memory (`records`, `byId`, `byKind`) | all events                        |
| Read   | `runRead` walks the **whole** `byKind` bucket for each kind in the query and runs `matchesFilter` on every event                      | all events of the queried kinds   |
| Write  | one global serial queue; each event is `access` + `mkdir` + `writeFile`                                                               | constant (about 0.4 ms per event) |
| Detect | `hasConflict` only checks events newer than the `dcb`                                                                                 | writes since the read (cheap)     |

Commands read 3–5 kinds, and every successful command triggers projection refetches that read again. Everything lives in one process: the indexes and the write queue are in memory, so you can't run a second instance.

## Assumptions

- **Events per visitor: about 52.** Spins and rolls are 1 event each. A road round is about 5: start, about 3 crosses, then a hit or a cash-out. On top of that come opens, bet changes and bonus events.
- **Event size:**
  - In memory: about 0.6–0.7 KB each, measured.
  - On disk: about 0.3–0.4 KB of JSON, but each file takes at least one 4 KB block on APFS or ext4.
- **One player action costs about 2 reads:** the command, then a projection refetch.
- **Machine:** Apple Silicon laptop, Bun, one process. Numbers come from a throwaway benchmark against the real `buildIndexes`, `runRead`, `scanDb` and `writeRecordFile` with synthetic events.

## Estimate

Visitors are counted over the store's whole life, not at the same time. Figures marked **(m)** were measured. The rest are extrapolated.

| Visitors (all time) | Events | RAM (RSS)             | Disk        | Boot scan  | One 5-kind read | Player actions/s |
| ------------------- | ------ | --------------------- | ----------- | ---------- | --------------- | ---------------- |
| 1k                  | 52k    | ~40 MB (m)            | ~200 MB (m) | ~2.6 s (m) | ~2.5 ms (m)     | ~200             |
| 10k                 | 520k   | ~345 MB (m)           | ~2 GB       | ~27 s      | ~31 ms (m)      | ~15              |
| 100k                | 5.2M   | 1.5 GB+, swapping (m) | ~20 GB      | ~4.5 min   | 0.3–5 s (m)     | < 1              |
| 1M                  | 52M    | ~35 GB                | ~200 GB     | ~45 min    | not viable      | not viable       |

The write path isn't the problem. About 0.4 ms per event (m) gives roughly 2,500 events per second through the single queue.

## Bottlenecks, in the order they hit

1. **Full bucket scan on every read.** CPU per request grows with all events of the queried kinds, and it blocks the event loop for every other visitor.
2. **The whole history lives in the heap.** That's about 0.7 KB per event, and nothing is ever unloaded.
3. **Boot reads and validates every file**, so restarts get slower as history grows.
4. **One file per event.** Each tiny file uses a full disk block, the store needs millions of inodes, and backups are slow.
5. **One process.** The in-memory indexes and the serial write queue mean you can't run a second API instance.

## Future changes, cheapest first

### 1. Index by visitor (same storage)

Add a `byVisitor` map in `indexes.ts` from `visitorId` to that visitor's events, newest first. `runRead` would use it whenever the filter has a plain `visitorId` match, which every command and projection has.

- **What it fixes:** reads cost only that visitor's ~50 events, so read cost stops depending on how many visitors there are, which removes bottleneck 1.
- **What it costs:** about 8 bytes per event.
- **Risk:** none for the ledger. It changes only how the store reads. Command queries, consistency boundaries and stored events stay exactly the same.
- **What it doesn't fix:** RAM use, boot time and the single process.

### 2. Move the ledger to MongoDB (the real fix)

The store's query syntax already mirrors the MongoDB driver (`$in`, `$gt`, `$or`, …), and the commands and projections depend only on the `read` / `write` interface in `types.ts`. So the swap stays inside `server/shared/event-store/`.

- **Read:** each `[kind, filter, { limit }]` entry becomes `find({ kind, ...filter }).sort({ id: -1 }).limit(limit)`.
- **Indexes:** declared in each event's schematox schema, which stays the single source of truth, and created at boot from the registered structs:

  ```ts
  export const roadLaneCrossed = object({
    ...STORE_EVENT_SHARED,
    kind: literal('road_lane_crossed'),
    visitorId,
    gameId,
    // ...
  }).meta({ indexes: [{ kind: 1, visitorId: 1, gameId: 1, id: -1 }] })
  ```

- **Ids:** a unique index on `id`, so an event can never be written twice. Events are only ever inserted, never updated or deleted.
- **Conditional append (the `dcb` check):** inside one transaction, check that no matching event exists with `id > after`, then insert. Snapshot isolation alone would let two concurrent transactions both pass that check. So each transaction also bumps a small lock document per `visitorId:gameId`, which forces the second transaction to abort. That gives the same `conflict` result the store returns today.
- **Boot:** no scan, constant memory, and any number of stateless API instances behind a load balancer.

### 3. Later, if a single visitor's history grows long

- **Cached projections:** keep a snapshot of each projection as of an event id, and fold only the events written after it. Stored events stay untouched; the snapshots are disposable caches.
- **Cold visitors:** they cost nothing in a database. The ledger rule still holds: events are archived, never deleted.

## Note on scope

This is a test project, and the reviewing team's backend is PHP, so I didn't build the migration here. The same design works on MySQL or Postgres:

- an append-only `events` table with `payload` stored as JSON;
- a composite index on `(visitor_id, game_id, id DESC)`;
- the conditional append done in a transaction that locks the stream row (`SELECT … FOR UPDATE`) before checking for newer events.

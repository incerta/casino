# Conventions

- Monorepo built on Bun workspaces: `server/` (CQRS API) and `client/` (Next.js). See README.md for how to run it.
- Prettier everywhere: single quotes, no semicolons, `trailingComma: es5`.

## Server (event sourcing)

- The event store lives in `server/shared/event-store/`, copied from vi-flow. Persisted events are never duplicated, overwritten or deleted.
- `db/test` and `db/e2e` are wiped on every `initEventStore()` call when `NODE_ENV` is `test` or `e2e`.
- Events contain only primitive fields, unions of primitives, or arrays of primitives. Every event needs a literal `kind` that matches its file name, `<entity>_<past-tense-verb>.ts`.
- Commands return `{ success: false, reason } as const` for business failures.
- Projections fold events, which arrive newest first.
- `GameConfig` in `games.ts` is a union on `type` (`slot`, `dice`, `road`). Each kind has its own commands and its own session projection (`slotSession`, `diceSession`, `roadSession`); commands reject other kinds with `game-not-found` via `findGameOfType`.
- Outcomes are decided by the commands (`play_round.ts`, `roll_dice.ts`, `cross_road_lane.ts`). Never trust the client for outcomes. The client may compute odds for display only.
- After adding or changing a handler, register it in `handlers.ts` and run `bun run gen` from the root. Never hand-edit `client/src/generated/client-api-types.ts`.

## Commands and the event ledger

- The event store is an append-only ledger: an event, once written, is permanent and is the source of truth. Treat every command that writes events as critical code. Change it deliberately, keep the diff minimal, and cover it with a test.
- A command's read query defines its consistency boundary: the `dcb` from that read guards the `write`. Declare the query inline in the command file, listing exactly the event kinds and filters the decision depends on.
- Don't share or abstract command queries or decision folds through helpers, base functions or projection code. A change made for one consumer must never silently widen, narrow or alter another command's boundary or logic.
- Projections may share read and fold helpers among themselves, but commands must never import them.
- Commands return only an acknowledgement: `{ success: true }` or `{ success: false, reason }`. They never return read data. Clients get state exclusively from projections, which are refetched through the `Projection` tag after a successful command.

## Tests (vitest, `server/**/*.test.ts`)

- Write event payloads inline in `store.write(...)`, so the type checker catches missing and extra fields.
- Don't add factory or builder helpers.
- Never cast through `unknown`, `any` or `never`. A single brand cast like `'x' as GameId` is fine.

## Client

- Data comes only from the generated RTK hooks on `cqrsApi`.
- Successful commands invalidate the single `Projection` tag, which refetches any active projections.
- Handle domain failures with an exhaustive `switch (res.reason)` that ends in `const missed: never`.
- Screens live in `src/screens/<Name>/`, with CSS Modules next to them. `src/app/**/page.tsx` files are thin wrappers.
- The casino shell (header, sidebar, footer, demo notice) lives in `src/components/AppShell/` and wraps every page from `layout.tsx`. Icons are inline SVGs in `src/components/icons.tsx`.
- Sections that aren't part of the demo are disabled items with a "Soon" chip. Don't add fake pages, real brand names or real-money promo copy.
- Everything game-related must be clearly labelled as simulated or test environment, with no real-money value implied.

## E2E (Playwright, `client/e2e/specs/*.spec.ts`)

- Run with `bun run test:e2e`. The config starts an isolated server on :8100 and client on :3100, so it doesn't conflict with `bun dev`.
- Don't share state between tests. Each test is a new visitor (fresh context, new `visitorId`).
- Prefer role and text locators. Shared actions such as `spin`, `roll`, `startRun`, `go`, `cashOut`, `changeBet` and `stat` live in `e2e/helpers/game.ts`.
- Random outcomes (e.g. a road hit) aren't forced: read the outcome from the stored events and assert on that.
- To assert that an interaction was recorded, read the visitor's events with `e2e/helpers/events.ts`.

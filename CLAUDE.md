# Conventions

- Monorepo built on Bun workspaces: `server/` (CQRS API) and `client/` (Next.js). See README.md for how to run it.
- Prettier everywhere: single quotes, no semicolons, `trailingComma: es5`.

## Server (event sourcing)

- The event store lives in `server/shared/event-store/`, copied from vi-flow. Persisted events are never duplicated, overwritten or deleted.
- `db/test` is wiped on every `initEventStore()` call when `NODE_ENV=test`.
- Events contain only primitive fields, unions of primitives, or arrays of primitives. Every event needs a literal `kind` that matches its file name, `<entity>_<past-tense-verb>.ts`.
- Commands read with a filter and pass the returned `dcb` to `write` when they depend on what they read.
- Commands return `{ success: false, reason } as const` for business failures.
- Projections fold events, which arrive newest first.
- Spin outcomes are decided in `commands/play_round.ts`. Never trust the client for outcomes.
- After adding or changing a handler, register it in `handlers.ts` and run `bun run gen` from the root. Never hand-edit `client/src/generated/client-api-types.ts`.

## Tests (vitest, `server/**/*.test.ts`)

- Write event payloads inline in `store.write(...)`, so the type checker catches missing and extra fields.
- Don't add factory or builder helpers.
- Never cast through `unknown`, `any` or `never`. A single brand cast like `'x' as GameId` is fine.

## Client

- Data comes only from the generated RTK hooks on `cqrsApi`.
- Successful commands invalidate the single `Projection` tag, which refetches any active projections.
- Handle domain failures with an exhaustive `switch (res.reason)` that ends in `const missed: never`.
- Screens live in `src/screens/<Name>/`, with CSS Modules next to them. `src/app/**/page.tsx` files are thin wrappers.
- Everything game-related must be clearly labelled as simulated or test environment, with no real-money value implied.

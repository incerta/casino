# Incerta Casino

Demo slot games: a test environment with simulated outcomes and no real money.

A Bun-workspaces monorepo:

- `server/` is the CQRS API on Express 5, port 8000. It is event-sourced, and events are stored as JSON files in `server/db/<NODE_ENV>/`, so **no database is needed**.
- `client/` is the Next.js App Router site on port 3000. It uses RTK Query, with API types generated from the server.

## Run

```sh
bun install            # once, from the repo root

cd server && bun dev   # http://localhost:8000
cd client && bun dev   # http://localhost:3000
```

There is no `.env` to set up. `NODE_ENV` defaults to `development`. The client reads `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000`.

To reset all demo state, delete `server/db/development/`.

## How it works

Every request is `POST /cqrs/<projection|command>/<name>` with a JSON payload.

- **Commands** (`server/commands/`) read events, check business rules, and append new events. The append is guarded by optimistic concurrency.
- **Projections** (`server/projections/`) fold events into a read model on every request.
- **Events** (`server/events/`) are schematox schemas. The file name matches the event `kind`.
- **Handlers** are registered in `server/handlers.ts`.
- **Client types** come from running `bun run gen` at the root. This writes `client/src/generated/client-api-types.ts`. From that file, `client/src/state/cqrs-api.ts` builds one RTK Query endpoint per handler: `useGamesQuery`, `usePlayRoundMutation` and so on.

Visitors are anonymous. The client keeps a random `visitorId` in localStorage and sends it as the `Authorization` header.

Each game interaction is recorded as an event:

| Interaction     | Event(s)                                      |
| --------------- | --------------------------------------------- |
| Open a game     | `game_opened`                                 |
| Change the bet  | `bet_changed`                                 |
| Spin            | `round_played` (+ `bonus_offered` on round 2) |
| Claim the bonus | `bonus_claimed`                               |

Spin outcomes are decided on the server. In this test environment, wins are deliberately frequent and are always labelled as simulated.

## Checks

```sh
bun run check          # from the root: server (tsc, prettier, vitest) + client (tsc, prettier, eslint)
```

## E2E tests (Playwright)

```sh
bunx playwright install chromium   # once, from client/
bun run test:e2e                   # from the root or client/
```

Playwright starts its own stack: the server on :8100 with `NODE_ENV=e2e` (event store in `server/db/e2e`, wiped on every start) and Next.js on :3100 with a separate `.next-e2e` build dir. It can run alongside a regular `bun dev`. Each spec runs on a desktop and a mobile (Pixel 7) project. Every test gets a fresh browser context, so it acts as a new anonymous visitor with its own event stream. Specs also assert on the event files the server writes.

# How it's done

I'll write this report without grammar check/fixes, so you know it's not an AI.

I've used TypeScript as the main language. Next.js for the client and Express.js for the server. Bun as the runtime. No database, just hand maid event sourcing system powered by my own `schematox` module. The `@reduxjs/toolkit` for client side state management, `playwright` for e2e testing and `viteteset` for unit testing.

I made this project in the couple of phases in aproximatelly 6 hours.

## Boilerplate (took 2 hours)

Because we dealing with money and `conversion tracking` systems I choose to build full on client/server CQRS file based event sourcing system. This way we don't need to have any database and any raise conditions are negated by event sourcing dynamic conditional boundaries.

My job here was to just point Claude CLI agent to a couple of similar projects and define requirements for the MVP.

After the first draft was ready. I asked AI dummy to make e2e playwright tests then I checked if everything is actually working as intended.

The next check is code itself. Two very important things AI missed:

1. AI abstracted some DCB (dynamic conditional boundary) queries into utility helpers shared throughout a couple of commands blindly following DRY pattern. This is wrong. The commands must not share any logic related to the DCB, we have immutable events ledger it's very important to avoid any type of coupling here.

The solution is to update CLAUDE.md CLI fixating those rules explicitly and adjust exiting commands/tests to follow the right pattern.

2. AI returned data from commands which defeats the purpose of CQRS system, the client must not build the logic upon command response with an exception of `success: false` responses which are carry `reason` union string literal for the specific command.

Rule enforced by CLAUDE.md update, the client actually didn't used this returned data, so it's a good example of AI bullshit we must avoid.

## Mimicry to https://wildies16.com/ (took 1 hour)

This is just one prompt and wait. The final result looks and fast without any adjustments. The AI figured out how to worked with CQRS system I've build and correctly handled request exceptions with exhaustive checking for each `reason` literal.

## Capacity estimate (took 30 min)

The bottleneck of the system is events immutable ledger. Currently we using self made file based event sourcing utility with runtime based indexing. This is bad for the server RAM, however the query syntax mimics MongoDB native driver, so we can easily rewrite it from file based to DB based storage. Indexes for the mongo schemas could be passed through `schematox` meta parameter which is the source of truth for all our events.

Since it's just a test job and your current backend is PHP and SQL it's not reasonable to flex on this here.

I've generated the capacity estimate (`CAPACITY.md`) for this project so all current issues are explicit.

## Description & deploy (took 2 hours)

Project is deployed on fly.io (https://incerta-casino-staging.fly.dev/)

Intentionally left out the production build optimizations, extra security checks, proper manual checks, CI/CD and monitoring. If it's not obvious from this point that I'm capable of doing things, that's fine. The quality of my work is log N to the time I put in it. For the test task this is the time I can afford to spent.

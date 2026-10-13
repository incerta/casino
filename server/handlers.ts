import type { ShallowCQRSHandler, ShallowPublicCQRSHandler } from './generics'
import type { CQRSHandlerKind } from './structs'

import { games } from './projections/games'
import { slotSession } from './projections/slot-session'
import { diceSession } from './projections/dice-session'
import { roadSession } from './projections/road-session'

import { openGame } from './commands/open_game'
import { changeBet } from './commands/change_bet'
import { playRound } from './commands/play_round'
import { claimBonus } from './commands/claim_bonus'
import { rollDice } from './commands/roll_dice'
import { startRoadRun } from './commands/start_road_run'
import { crossRoadLane } from './commands/cross_road_lane'
import { cashOutRoadRun } from './commands/cash_out_road_run'

export type CQRSHandlers = typeof cqrsHandlers

export const cqrsHandlers = {
  projection: {
    games,
    slotSession,
    diceSession,
    roadSession,
  },
  command: {
    openGame,
    changeBet,
    playRound,
    claimBonus,
    rollDice,
    startRoadRun,
    crossRoadLane,
    cashOutRoadRun,
  },
} as const satisfies Record<
  CQRSHandlerKind,
  Record<string, ShallowCQRSHandler<any>>
>

/**
 * Handler ids of kind `K` whose handler declares `PublicHandlerDeps` — i.e.
 * runs without an actor. A handler that reads `visitorId` off its deps
 * resolves to `never` here and so can't be listed in `publicHandlers`.
 */
type PublicHandlerIds<K extends CQRSHandlerKind> = {
  [
    L in keyof CQRSHandlers[K]
  ]: CQRSHandlers[K][L] extends ShallowPublicCQRSHandler<any, any> ? L : never
}[keyof CQRSHandlers[K]]

/**
 * Handlers reachable without an `Authorization` header. Everything not listed
 * here stays behind the 401 gate in `./routes/dispatch-cqrs-handler.ts`.
 *
 * The `satisfies` clause rejects both a handler id that doesn't exist and one
 * whose handler requires an actor, so a handler can't be opened up while it
 * still reads `visitorId`.
 */
export const publicHandlers = {
  projection: ['games'],
  command: [],
} as const satisfies {
  [K in CQRSHandlerKind]: readonly PublicHandlerIds<K>[]
}

export function isPublicHandler(
  handlerKind: string,
  handlerId: string
): boolean {
  const ids = (publicHandlers as Record<string, readonly string[]>)[handlerKind]

  return ids !== undefined && ids.includes(handlerId)
}

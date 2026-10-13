import type { VisitorId } from './structs'
import type { EventStore } from './event-store'

/**
 * Deps available to every handler, identified or not.
 *
 * Public handlers (see `publicHandlers` in `./handlers.ts`) declare this
 * narrower shape instead of `HandlerDeps`: it's a supertype of `HandlerDeps`,
 * so such a handler still satisfies `ShallowCQRSHandler` and stays in the one
 * shared registry, while the type makes it explicit that it runs without an
 * actor and therefore must never write an event.
 */
export type PublicHandlerDeps<T = {}> = T & {
  eventStore: EventStore
}

export type HandlerDeps<T = {}> = PublicHandlerDeps<T> & {
  visitorId: VisitorId
}

export type InferClientAPI<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? {
        [L in keyof T[K]]: T[K][L] extends ShallowCQRSHandler<infer U, infer V>
          ? (payload: U) => Promise<V>
          : never
      }
    : never
}

export type ShallowCQRSHandler<
  Payload = Record<string, unknown>,
  Response = { success: boolean },
> = (deps: HandlerDeps, payload: Payload) => Promise<Response>

export type ShallowPublicCQRSHandler<
  Payload = Record<string, unknown>,
  Response = { success: boolean },
> = (deps: PublicHandlerDeps, payload: Payload) => Promise<Response>

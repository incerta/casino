import { visitorId, cqrsHandlerKind } from '../structs'
import { cqrsHandlers, isPublicHandler } from '../handlers'

import type { RequestHandler } from 'express'
import type { EventStore } from '../event-store'
import type { ShallowCQRSHandler, ShallowPublicCQRSHandler } from '../generics'

export function dispatchCqrsHandlerRoute(deps: {
  eventStore: EventStore
}): RequestHandler<{ handlerKind: string; handlerId: string }> {
  return async (req, res) => {
    const parsedHandlerKind = cqrsHandlerKind.parse(req.params.handlerKind)

    if (parsedHandlerKind.success === false) {
      return res
        .status(404)
        .json({ success: false, reason: 'invalid-handler-kind' })
    }

    const handlerKind = parsedHandlerKind.data
    const handlerId = req.params.handlerId
    const handler = (cqrsHandlers[handlerKind] as Record<string, unknown>)[
      handlerId
    ] as ShallowCQRSHandler | undefined

    if (handler === undefined) {
      return res
        .status(404)
        .json({ success: false, reason: 'invalid-handler-id' })
    }

    const payload = req.body
    let response: Awaited<ReturnType<ShallowCQRSHandler>>

    if (isPublicHandler(handlerKind, handlerId)) {
      const publicHandler = handler as ShallowPublicCQRSHandler
      response = await publicHandler({ eventStore: deps.eventStore }, payload)
    } else {
      const parsedVisitorId = visitorId.parse(req.headers.authorization)

      if (parsedVisitorId.success === false) {
        return res.status(401).end()
      }

      response = await handler(
        { eventStore: deps.eventStore, visitorId: parsedVisitorId.data },
        payload
      )
    }

    const status =
      handlerKind === 'projection' ? 200 : response.success ? 201 : 200

    return res.status(status).json(response)
  }
}

import express from 'express'
import cors from 'cors'

import { env, PORT, CLIENT_ORIGIN } from './config'
import { initStore } from './event-store'
import { dispatchCqrsHandlerRoute } from './routes/dispatch-cqrs-handler'

const app = express()

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})

async function main() {
  const eventStore = await initStore()

  app.use(cors({ origin: CLIENT_ORIGIN }))
  app.use(express.json())

  app.use((_, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    next()
  })

  app.post(
    '/cqrs/:handlerKind/:handlerId',
    dispatchCqrsHandlerRoute({ eventStore })
  )

  app.listen(PORT, () => {
    console.log(`Listen on ${PORT}; NODE_ENV: ${env.NODE_ENV}`)
  })
}

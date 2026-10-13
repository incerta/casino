import express from 'express'
import cors from 'cors'

import { env } from './config'
import { initStore } from './event-store'
import { dispatchCqrsHandlerRoute } from './routes/dispatch-cqrs-handler'

const PORT = 8000
const CLIENT_ORIGIN = 'http://localhost:3000' // TODO: use different origin in production env

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

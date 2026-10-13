import { object, union, literal } from 'schematox'
import dotenv from 'dotenv'

const envStruct = object({
  NODE_ENV: union([
    literal('development'),
    literal('production'),
    literal('test'),
    literal('e2e'),
  ]),
})

dotenv.config({ quiet: true })

// Defaults to `development` so the project runs without a `.env` file
const parsedEnv = envStruct.parse({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
})

if (parsedEnv.success === false) {
  throw Error(
    `Failed to parse dotenv config: ${JSON.stringify(parsedEnv.error)}`
  )
}

export const env = parsedEnv.data

export const PORT = Number(process.env.PORT ?? 8000)

/** The only origin allowed by CORS (the Next.js client) */
export const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'

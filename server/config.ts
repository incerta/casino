import { object, union, literal } from 'schematox'
import dotenv from 'dotenv'

const envStruct = object({
  NODE_ENV: union([
    literal('development'),
    literal('production'),
    literal('test'),
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

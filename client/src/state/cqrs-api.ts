import {
  createApi,
  fakeBaseQuery,
  type EndpointBuilder,
  type MutationDefinition,
  type QueryDefinition,
} from '@reduxjs/toolkit/query/react'
import { httpAPI } from '@/api/http'
import type { ClientAPI } from '@/generated/client-api-types'

type ProjectionKey = keyof ClientAPI['projection']
type CommandKey = keyof ClientAPI['command']

type Payload<F> = F extends (payload: infer P) => Promise<unknown> ? P : never
type Result<F> = F extends (...args: never[]) => Promise<infer R> ? R : never

export type CqrsError = { message: string }

const REDUCER_PATH = 'cqrsApi'
type ReducerPath = typeof REDUCER_PATH

/**
 * Every projection provides this tag and every command invalidates it, so a
 * successful command refetches all projections that are currently in use.
 */
const PROJECTION_TAG = 'Projection'
type TagType = typeof PROJECTION_TAG

type CqrsBaseQuery = ReturnType<typeof fakeBaseQuery<CqrsError>>
type CqrsBuilder = EndpointBuilder<CqrsBaseQuery, TagType, ReducerPath>

type ProjectionEndpoints = {
  [K in ProjectionKey]: QueryDefinition<
    Payload<ClientAPI['projection'][K]>,
    CqrsBaseQuery,
    TagType,
    Result<ClientAPI['projection'][K]>,
    ReducerPath
  >
}

type CommandEndpoints = {
  [K in CommandKey]: MutationDefinition<
    Payload<ClientAPI['command'][K]>,
    CqrsBaseQuery,
    TagType,
    Result<ClientAPI['command'][K]>,
    ReducerPath
  >
}

function toCqrsError(error: unknown): CqrsError {
  return { message: error instanceof Error ? error.message : 'Unknown error' }
}

function buildProjectionEndpoints(builder: CqrsBuilder): ProjectionEndpoints {
  return (Object.keys(httpAPI.projection) as ProjectionKey[]).reduce<
    Record<string, unknown>
  >((acc, key) => {
    acc[key] = builder.query({
      queryFn: async (payload: unknown) => {
        try {
          return { data: await httpAPI.projection[key](payload as never) }
        } catch (error) {
          return { error: toCqrsError(error) }
        }
      },
      providesTags: [PROJECTION_TAG],
    })
    return acc
  }, {}) as ProjectionEndpoints
}

function buildCommandEndpoints(builder: CqrsBuilder): CommandEndpoints {
  return (Object.keys(httpAPI.command) as CommandKey[]).reduce<
    Record<string, unknown>
  >((acc, key) => {
    acc[key] = builder.mutation({
      queryFn: async (payload: unknown) => {
        try {
          return { data: await httpAPI.command[key](payload as never) }
        } catch (error) {
          return { error: toCqrsError(error) }
        }
      },
      invalidatesTags: (result) => (result?.success ? [PROJECTION_TAG] : []),
    })
    return acc
  }, {}) as CommandEndpoints
}

export const cqrsApi = createApi({
  reducerPath: REDUCER_PATH,
  baseQuery: fakeBaseQuery<CqrsError>(),
  tagTypes: [PROJECTION_TAG],
  endpoints: (builder) => ({
    ...buildProjectionEndpoints(builder),
    ...buildCommandEndpoints(builder),
  }),
})

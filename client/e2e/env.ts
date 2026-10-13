/**
 * The e2e stack runs on its own ports with its own event store
 * (`server/db/e2e`, wiped on server start) and Next.js build dir
 * (`.next-e2e`), so it never touches a regular `bun dev` session.
 */
export const E2E_SERVER_PORT = 8100
export const E2E_CLIENT_PORT = 3100

export const API_URL = `http://localhost:${E2E_SERVER_PORT}`
export const WEB_URL = `http://localhost:${E2E_CLIENT_PORT}`

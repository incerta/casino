import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: false,
  // Lets the e2e stack run next to a regular `bun dev` (see e2e/playwright.config.ts)
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Staging runs the API in the same container and proxies it here, so the
  // browser stays same-origin (see Dockerfile and start.sh)
  async rewrites() {
    const apiProxyUrl = process.env.API_PROXY_URL

    if (apiProxyUrl === undefined) return []

    return [
      { source: '/cqrs/:path*', destination: `${apiProxyUrl}/cqrs/:path*` },
    ]
  },
}

export default nextConfig

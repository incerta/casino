import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: false,
  // Lets the e2e stack run next to a regular `bun dev` (see e2e/playwright.config.ts)
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
}

export default nextConfig

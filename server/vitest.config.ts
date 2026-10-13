import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    reporters: 'minimal',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.test.ts', '**/tests.ts', '**/tests/**/*.ts'],
          environment: 'node',
          env: { NODE_ENV: 'test' },
          fileParallelism: false,
          maxWorkers: 1,
          server: {
            deps: {
              inline: ['schematox'],
            },
          },
        },
      },
    ],
  },
})

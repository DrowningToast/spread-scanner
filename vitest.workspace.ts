import { defineWorkspace } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineWorkspace([
  {
    test: {
      name: 'node',
      environment: 'node',
      include: [
        'src/services/**/*.test.ts',
        'src/config/**/*.test.ts',
        'src/utils/**/*.test.ts',
      ],
    },
  },
  {
    plugins: [react()],
    test: {
      name: 'browser',
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/app/__tests__/setup.ts'],
      include: ['src/app/**/*.test.{ts,tsx}'],
    },
  },
])

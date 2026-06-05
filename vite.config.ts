import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/ondo': {
        target: 'https://api.ondoperps.xyz/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ondo/, ''),
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': process.env
  },
  plugins: [react()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/server-submissions': 'http://localhost:4000',
      '/server-raw-submissions': 'http://localhost:4000',
      '/server-analytics': 'http://localhost:4000',
      '/server-insights': 'http://localhost:4000',
      '/server-auth': 'http://localhost:4000',
      '/server-api-keys': 'http://localhost:4000',
      '/server-forms': 'http://localhost:4000',
      '/server-submit': 'http://localhost:4000',
    }
  }
})


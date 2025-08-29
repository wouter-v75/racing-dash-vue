import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Tip: if you use `vercel dev` for local API functions, they default to port 3000.
// If you want Vite (5173) to proxy /api/* to that, uncomment the proxy section.
export default defineConfig({
  plugins: [vue()],
  server: {
    // proxy: { '/api': 'http://localhost:3000' }
  }
})

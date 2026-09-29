import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4174,
    strictPort: true,
  },
})

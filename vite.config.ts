import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // served under /tools/pizza-oven-v2/ — relative asset paths
  plugins: [react()],
})

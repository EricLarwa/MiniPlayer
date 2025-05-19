import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'), // 👈 Set root to where index.html is
  base:'https://ericlarwa.github.io/MiniPlayer/',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'), // output directory
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
})

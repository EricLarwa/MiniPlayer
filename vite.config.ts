// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    assetsDir: 'assets', // Specify assets directory
    assetsInlineLimit: 0, 
    rollupOptions: {
      output: {
        assetFileNames: 'assets/imgs/[name].[ext]' // Keep assets in assets folder
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      'assets': path.resolve(__dirname, 'src/renderer/assets') // Add assets alias
    },
  },
})
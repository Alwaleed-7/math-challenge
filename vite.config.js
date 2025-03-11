import { defineConfig } from 'vite'

export default defineConfig({
  base: '/math-challenge/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})
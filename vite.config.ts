import { defineConfig } from 'vite'

// Two pages (index.html and the Konami-only recruiting.html) plus modules in src/; public/ is copied as is.
export default defineConfig({
  base: '/personal-website/',
  build: {
    rollupOptions: {
      input: { main: 'index.html', recruiting: 'recruiting.html' },
    },
  },
})

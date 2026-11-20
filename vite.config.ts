import { defineConfig } from 'vite'

// One page (index.html) plus its modules in src/; public/ is copied as is.
export default defineConfig({
  base: '/personal-website/',
})

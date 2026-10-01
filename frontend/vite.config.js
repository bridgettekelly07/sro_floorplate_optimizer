import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// base './' keeps every asset and data path relative, so the built app works
// from any folder, including a GitHub Pages project site.
export default defineConfig({
  base: './',
  plugins: [svelte()],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Post-process built HTML: convert render-blocking <link rel="stylesheet">
 * to preload + onload pattern so CSS doesn't block first paint.
 */
function cssNonBlocking() {
  return {
    name: 'css-non-blocking',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
        `<link rel="preload" href="$1" as="style" onload="this.rel='stylesheet'">\n    <noscript><link rel="stylesheet" href="$1"></noscript>`
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cssNonBlocking()],
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react-vendor', test: /node_modules\/(react|react-dom)/ },
            { name: 'chart-vendor', test: /node_modules\/recharts/ },
            { name: 'motion', test: /node_modules\/framer-motion/ },
            { name: 'icons', test: /node_modules\/lucide-react/ },
          ],
        },
      },
    },
  },
})

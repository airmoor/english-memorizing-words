import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // Activate new SW immediately on all tabs — no stale deployments
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,

        // Cache app shell + static assets (CSS, JS, icons, fonts)
        // API calls are intentionally excluded — auth/mutable state must stay fresh
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Runtime caching: only image assets (icons already precached above)
        runtimeCaching: [
          {
            // Cache navigations with network-first: always try fresh HTML,
            // fall back to cached shell if offline
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lexis-navigation',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },

      // Web App Manifest
      manifest: {
        name: 'Lexis',
        short_name: 'Lexis',
        description: 'Dictionary-first spaced repetition for advanced English vocabulary.',
        theme_color: '#0e0e11',
        background_color: '#0e0e11',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
    }),
  ],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
})

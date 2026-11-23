/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { trailOutlines } from './scripts/vite-trail-outlines.mjs'

/** The app only needs id/tipo/dia/ambiente from content/midia.json; generation prompts stay out of the bundle. */
function slimMediaCatalog(): Plugin {
  return {
    name: 'slim-media-catalog',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('\\').join('/').endsWith('/content/midia.json')) return
      const data = JSON.parse(code) as { itens: Record<string, unknown>[] }
      const itens = data.itens.map(({ id, tipo, dia, ambiente }) => ({ id, tipo, dia, ambiente }))
      return { code: JSON.stringify({ itens }), map: null }
    },
  }
}

export default defineConfig({
  plugins: [
    slimMediaCatalog(),
    trailOutlines(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon.svg'],
      manifest: {
        name: 'A Palavra em Ordem',
        short_name: 'Palavra em Ordem',
        description: 'Entender a Bíblia inteira, em ordem, 5 minutos por dia.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1E2230',
        theme_color: '#F5EFE3',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + all lesson content (the JSON is bundled into the JS) work offline from the first visit.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // The Supabase client is a lazy chunk: downloaded only when account features are used.
        // Media stays on demand (runtime cache below); the 1024px symbol PNG masters are never precached.
        // The landing page (/lp/) and its GSAP/Lenis chunks are not part of the app shell.
        globIgnores: ['**/supabase-*.js', 'media/**', 'lp/**', '**/lp-*.js', '**/lp-*.css'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/lp(\/|$)/],
        importScripts: ['/reminder-sw.js'],
        runtimeCaching: [
          {
            // Images, videos and sounds are cached as they are visited.
            urlPattern: ({ url }) => url.pathname.startsWith('/media/') || url.pathname.startsWith('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pao-media',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'pao-font-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'pao-fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Two pages: the app (/) and the sales landing page (/lp/).
      input: { main: 'index.html', lp: 'lp/index.html' },
      output: {
        manualChunks: (id) =>
          id.includes('node_modules/@supabase/') ? 'supabase'
          : /node_modules[\\/](gsap|lenis)[\\/]/.test(id) ? 'lp-vendor'
          : undefined,
      },
    },
  },
  server: { host: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})

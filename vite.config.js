import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { sites } from '@openai/sites-vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    sites(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Кампус Пульс',
        short_name: 'Кампус',
        description: 'Розклад занять, дзвінки та домашні завдання групи КН-31.',
        lang: 'uk',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#09080d',
        theme_color: '#09080d',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/app-icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Розклад', short_name: 'Розклад', url: '/#today-schedule' },
          { name: 'Завдання', short_name: 'Завдання', url: '/#homework' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'шрифти',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
  },
})

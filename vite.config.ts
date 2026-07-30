import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/first-medical/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'First Medical Tube Change Tracking',
        short_name: 'First Medical',
        description: 'Patient follow-up and tube change tracking',
        theme_color: '#d01020',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // the app shell works with no signal; data comes from the IndexedDB cache
        globPatterns: ['**/*.{js,css,html,png,jpg,svg}'],
        navigateFallback: '/first-medical/index.html',
        runtimeCaching: [
          {
            // never cache API calls in the service worker; offline.ts owns data
            urlPattern: /^https:\/\/yrngmoerfbclztkovxxl\.supabase\.co\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})

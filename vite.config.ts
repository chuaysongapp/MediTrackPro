import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'MediTrack Pro - ระบบจัดคลังยา & สุขภาพครอบครัว',
          short_name: 'MediTrack Pro',
          description: 'ระบบจัดการคลังยา เตือนทานยา และติดตามสุขภาพครอบครัว',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0f172a',
          theme_color: '#059669',
          icons: [
            {src: 'icon-192.png', sizes: '192x192', type: 'image/png'},
            {src: 'icon-512.png', sizes: '512x512', type: 'image/png'},
            {src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,mjs}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({url}) =>
                /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|www\.googleapis\.com|firebaseinstallations\.googleapis\.com|firebaseio\.com/.test(
                  url.href,
                ),
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {'@': path.resolve(__dirname, '.')},
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

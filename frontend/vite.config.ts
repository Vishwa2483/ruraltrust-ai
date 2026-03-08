import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['pwa-512x512.png', 'apple-touch-icon.png'],
            manifest: {
                name: 'RuralTrust AI',
                short_name: 'RuralTrust',
                description: 'Intelligent Rural Complaint Management System - AI-powered governance for rural communities',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
                categories: ['government', 'productivity', 'utilities'],
                screenshots: [
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'RuralTrust AI Home Screen',
                    },
                ],
            },
            workbox: {
                // Cache app shell
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // Network first for API calls
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/ruraltrust-backend\.onrender\.com\/api\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                            }
                        },
                    },
                ],
                // Show custom offline page
                navigateFallback: '/index.html',
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],
    server: {
        port: 3000,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
});

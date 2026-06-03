import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        // Proxy API traffic through the dev server so the browser sees same-origin
        // requests — no CORS preflights in local development.
        // Set VITE_API_BASE_URL=/api in .env (see .env.example).
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/api/, ''),
                ws: true,
            },
        },
    },
});

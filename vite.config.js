import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { iaPlaywrightRunnerPlugin } from './scripts/vite-ia-playwright-runner.mjs';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    Object.assign(process.env, env);
    const plugins = [react()];
    if (mode === 'development') {
        plugins.push(iaPlaywrightRunnerPlugin());
    }
    return {
        plugins,
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
    };
});

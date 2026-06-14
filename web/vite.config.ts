import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_BASE = process.env.VITE_API_BASE ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API + websocket to the Fastify service during dev so the web app
    // is effectively same-origin (matches the single-origin production setup).
    proxy: {
      '/api': { target: API_BASE, changeOrigin: true },
      '/socket.io': { target: API_BASE, ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

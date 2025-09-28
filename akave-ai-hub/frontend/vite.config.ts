import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // ✅ Frontend runs on 5173 (standard Vite port)
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // ✅ Backend runs on 3000
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000', // ✅ WebSocket on backend port
        ws: true,
      },
    },
  },
});
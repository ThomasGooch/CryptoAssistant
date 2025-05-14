import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5052',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'http://localhost:5052',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSockets for SignalR
      },
    },
  },
  test: {
    environment: 'jsdom', // Use jsdom for React testing
    setupFiles: './src/test/setup.ts', // Add a setup file for global configurations
  },
});

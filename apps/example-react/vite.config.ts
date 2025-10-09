import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/chzzk': {
        target: 'https://openapi.chzzk.naver.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chzzk/, ''),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Remove browser headers that might cause CORS issues
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            // Set required headers
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        }
      },
      '/api/soop': {
        target: 'https://api.sooplive.co.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/soop/, ''),
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      events: 'events'
    }
  },
  optimizeDeps: {
    include: ['events']
  },
  define: {
    'global': 'globalThis',
    'process.env': {}
  }
});

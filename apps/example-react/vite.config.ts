import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createYouTubeStreamHandler } from '../../server/youtube-stream';

export default defineConfig(({ mode }) => {
  const apiBaseUrl = loadEnv(mode, process.cwd(), 'VITE_API_URL').VITE_API_URL?.trim().replace(/\/+$/, '') ||
    (mode === 'production' ? 'https://api.galashow.cloud' : 'https://api-dev.galashow.cloud');
  return ({
  plugins: [react(), {
    name: 'youtube-chat-relay',
    configureServer(server) {
      server.middlewares.use('/api/youtube/chat/stream', createYouTubeStreamHandler({
        protoPath: fileURLToPath(new URL('../../server/youtube-stream.proto', import.meta.url)),
      }));
    },
  }],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/chzzk': {
        target: apiBaseUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chzzk/, '/chzzk'),
        secure: false,
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
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createPolyChatHandler, relayOptionsFromEnv } from '../../server';

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'polychat-api-relay',
    configureServer(server) {
      const relayEnv = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');
      server.middlewares.use('/api', createPolyChatHandler({
        ...relayOptionsFromEnv(relayEnv),
        protoPath: fileURLToPath(new URL('../../server/youtube-stream.proto', import.meta.url)),
      }));
    },
  }],
  server: {
    port: 3000,
    open: true,
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
}));

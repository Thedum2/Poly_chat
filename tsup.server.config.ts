import { defineConfig } from 'tsup';

export default defineConfig({
  tsconfig: 'server/tsconfig.json',
  entry: { index: 'server/index.ts', cli: 'server/polychat-server.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist/server',
});

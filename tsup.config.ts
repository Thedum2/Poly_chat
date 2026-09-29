import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  platform: 'browser',
  // uuid 13 is ESM-only; bundle its browser implementation into both public formats.
  noExternal: ['uuid'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  outDir: 'dist',
  treeshake: true,
});

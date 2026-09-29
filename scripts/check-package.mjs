import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this check with npm run test:package.');
const npm = (args, cwd = root) => execFileSync(process.execPath, [npmCli, ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
});

const artifacts = join(root, '.artifacts');
mkdirSync(artifacts, { recursive: true });
const [packed] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', artifacts]));
const files = new Set(packed.files.map(file => file.path));
const targets = value => typeof value === 'string' ? [value] : Object.values(value).flatMap(targets);
for (const target of [manifest.main, manifest.module, manifest.types, ...targets(manifest.exports)]) {
  assert.ok(files.has(target.replace(/^\.\//, '')), `Missing package entry: ${target}`);
}
assert.ok([...files].every(file => !file.startsWith('server/') && !file.startsWith('apps/')),
  'The browser library package must not include local server or demo sources.');

// Install the tarball outside the workspace so hoisted/dev dependencies cannot hide missing dependencies.
const tempParent = resolve(tmpdir());
const consumer = mkdtempSync(join(tempParent, 'polychat-package-'));
try {
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  npm(['install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', '--package-lock=false',
    join(artifacts, packed.filename)], consumer);
  const checks = `
    for (const name of ['PolyChat', 'ChzzkAdapter', 'SoopAdapter', 'YouTubeAdapter']) {
      if (typeof library[name] !== 'function') throw new Error('Missing export: ' + name);
      new library[name]();
    }
  `;
  execFileSync(process.execPath, ['--input-type=module', '-e',
    `import * as library from 'polychat-bridge'; ${checks}`], { cwd: consumer, stdio: 'inherit' });
  execFileSync(process.execPath, ['--input-type=commonjs', '-e',
    `const library = require('polychat-bridge'); ${checks}`], { cwd: consumer, stdio: 'inherit' });
  await build({
    stdin: { contents: "import { PolyChat } from 'polychat-bridge'; console.log(new PolyChat());", resolveDir: consumer },
    bundle: true, platform: 'browser', write: false,
    define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
  });
  const typedConsumer = "import { PolyChat, type ChatMessage } from 'polychat-bridge'; const chat = new PolyChat(); const message: ChatMessage | undefined = undefined;";
  writeFileSync(join(consumer, 'consumer.mts'), typedConsumer);
  writeFileSync(join(consumer, 'consumer.cts'), typedConsumer);
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'),
    '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2020',
    '--strict', '--noEmit', '--skipLibCheck', 'consumer.mts', 'consumer.cts'], { cwd: consumer, stdio: 'inherit' });
  console.log(`Verified ESM/CJS/browser consumers, TypeScript declarations and published entry points: ${packed.filename}`);
} finally {
  assert.equal(dirname(consumer), tempParent);
  assert.ok(consumer.startsWith(`${tempParent}${sep}polychat-package-`));
  rmSync(consumer, { recursive: true, force: true });
}

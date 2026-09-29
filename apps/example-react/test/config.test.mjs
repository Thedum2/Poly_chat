import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SourceTextModule } from 'node:vm';

async function loadConfig(env) {
  const source = await readFile(new URL('../src/config.ts', import.meta.url), 'utf8');
  const module = new SourceTextModule(source, {
    initializeImportMeta(meta) { meta.env = env; },
  });
  await module.link(() => {});
  await module.evaluate();
  return module.namespace;
}

test('local Vite serve keeps the CHZZK proxy even with public mode defaults', async () => {
  const config = await loadConfig({ DEV: true, MODE: 'development', VITE_API_URL: 'https://api-dev.galashow.cloud' });
  assert.equal(config.CHZZK_API_BASE_URL, '/api/chzzk');
  assert.equal(config.YOUTUBE_STREAM_URL, '/api/youtube/chat/stream');
});

test('static builds use the matching API without relying on a Vite proxy', async () => {
  for (const [mode, expected] of [
    ['development', 'https://api-dev.galashow.cloud/chzzk'],
    ['production', 'https://api.galashow.cloud/chzzk'],
  ]) {
    for (const value of [undefined, '', '   ']) {
      const config = await loadConfig({ DEV: false, MODE: mode, VITE_API_URL: value });
      assert.equal(config.CHZZK_API_BASE_URL, expected);
      assert.equal(config.YOUTUBE_STREAM_URL, expected.replace('/chzzk', '/youtube/chat/stream'));
    }
  }
});

test('deployed API overrides do not create a double slash before the CHZZK route', async () => {
  const config = await loadConfig({ DEV: false, MODE: 'production', VITE_API_URL: ' http://localhost:8080/api/// ' });
  assert.equal(config.CHZZK_API_BASE_URL, 'http://localhost:8080/api/chzzk');
  assert.equal(config.YOUTUBE_STREAM_URL, 'http://localhost:8080/api/youtube/chat/stream');
});

test('YouTube relay URL can point to an independently hosted server', async () => {
  const config = await loadConfig({ DEV: true, MODE: 'development', VITE_YOUTUBE_STREAM_URL: ' http://localhost:3001/youtube/chat/stream ' });
  assert.equal(config.YOUTUBE_STREAM_URL, 'http://localhost:3001/youtube/chat/stream');
});

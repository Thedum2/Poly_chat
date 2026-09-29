import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createPolyChatServer, relayOptionsFromEnv } from '../server/index';

test('one host exposes public configuration and protects YouTube streaming with the same origins', async (t) => {
  const server = createPolyChatServer(relayOptionsFromEnv({
    CHZZK_CLIENT_ID: 'chzzk-public', CHZZK_CLIENT_SECRET: 'chzzk-private',
    SOOP_CLIENT_ID: 'soop-public', SOOP_CLIENT_SECRET: 'soop-private',
    YOUTUBE_CLIENT_ID: 'youtube-public', POLYCHAT_ALLOWED_ORIGINS: 'https://app.example',
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const config = await fetch(base + '/config', { headers: { Origin: 'https://app.example' } });
  assert.equal(config.headers.get('access-control-allow-origin'), 'https://app.example');
  assert.deepEqual(await config.json(), { chzzk: { clientId: 'chzzk-public' }, soop: { clientId: 'soop-public' }, youtube: { clientId: 'youtube-public' } });
  const preflight = await fetch(base + '/youtube/chat/stream', { method: 'OPTIONS', headers: { Origin: 'https://app.example', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 204);
  const stream = await fetch(base + '/youtube/chat/stream', { method: 'POST', headers: { Origin: 'https://app.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(stream.status, 401);
  const forbidden = await fetch(base + '/youtube/chat/stream', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(forbidden.status, 403);
});

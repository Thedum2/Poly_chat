import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { chzzkAuthStore } from '../src/store/chzzkAuthStore';
import { chzzkAuthApi } from '../src/api/modules/chzzk/auth';
import { chzzkChannelApi } from '../src/api/modules/chzzk/channel';
import { chzzkSessionApi } from '../src/api/modules/chzzk/session';

test('CHZZK requests use only the backend contract and user bearer token', async () => {
  const requests: Array<{ method: string; url: string; headers: Record<string, string | string[] | undefined>; body: string }> = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method!, url: req.url!, headers: req.headers, body });
    res.setHeader('Content-Type', 'application/json');
    const content = req.url === '/chzzk/config' ? { clientId: 'public-id' }
      : req.url === '/chzzk/sessions' ? { url: 'wss://example.invalid/socket' }
      : req.url === '/chzzk/users/me' ? { channelId: 'channel-id' }
      : req.url?.startsWith('/chzzk/channels') ? { data: [] }
      : { accessToken: 'user-token', refreshToken: 'refresh-token' };
    res.end(JSON.stringify({ code: 200, message: null, content }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    chzzkAuthStore.getState().setApiBaseUrl(`http://127.0.0.1:${address.port}/chzzk`);
    chzzkAuthStore.getState().setTokens({ accessToken: 'user-token', refreshToken: 'refresh-token' });
    assert.equal((await chzzkAuthApi.getConfig()).content.clientId, 'public-id');
    await chzzkAuthApi.getAccessToken({ code: 'oauth-code', state: 'oauth-state' });
    await chzzkAuthApi.refreshAccessToken({ refreshToken: 'refresh-token' });
    await chzzkAuthApi.revokeAccessToken({ token: 'user-token', tokenTypeHint: 'access_token' });
    await chzzkChannelApi.getUserInfo();
    await chzzkChannelApi.getChannelInfo('channel-id');
    await chzzkSessionApi.createClientSession();
    await chzzkSessionApi.subscribeToChat({ sessionKey: 'session-key' });
    await chzzkSessionApi.subscribeToDonation({ sessionKey: 'session-key' });
    await chzzkSessionApi.subscribeToSubscription({ sessionKey: 'session-key' });

    assert.deepEqual(requests.map(({ method, url }) => `${method} ${url}`), [
      'GET /chzzk/config', 'POST /chzzk/auth/token', 'POST /chzzk/auth/refresh',
      'POST /chzzk/auth/revoke', 'GET /chzzk/users/me',
      'GET /chzzk/channels?channelIds=channel-id', 'POST /chzzk/sessions',
      'POST /chzzk/sessions/events/subscribe/chat',
      'POST /chzzk/sessions/events/subscribe/donation',
      'POST /chzzk/sessions/events/subscribe/subscription',
    ]);
    assert.deepEqual(requests.slice(0, 4).map(({ body }) => body && JSON.parse(body)), [
      '', { code: 'oauth-code', state: 'oauth-state' },
      { refreshToken: 'refresh-token' }, { token: 'user-token', tokenTypeHint: 'access_token' },
    ]);
    assert.equal(requests[6].body, '');
    for (const request of requests) {
      assert.equal(request.headers['client-id'], undefined);
      assert.equal(request.headers['client-secret'], undefined);
    }
    for (const request of requests.slice(4)) assert.equal(request.headers.authorization, 'Bearer user-token');
    for (const request of requests.slice(7)) assert.deepEqual(JSON.parse(request.body), { sessionKey: 'session-key' });
  } finally {
    chzzkAuthStore.getState().clearTokens();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

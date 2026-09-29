import assert from 'node:assert/strict';
import test from 'node:test';
import type { InternalAxiosRequestConfig } from 'axios';
import { axiosInstance } from '../src/api/axiosInstance';
import { chzzkAuthStore } from '../src/store/chzzkAuthStore';
import { chzzkAuthApi } from '../src/api/modules/chzzk/auth';
import { chzzkChannelApi } from '../src/api/modules/chzzk/channel';
import { chzzkSessionApi } from '../src/api/modules/chzzk/session';

test('CHZZK relays all requests without sending a browser client secret', async (t) => {
  const requests: InternalAxiosRequestConfig[] = [];
  const originalAdapter = axiosInstance.defaults.adapter;
  t.after(() => { axiosInstance.defaults.adapter = originalAdapter; chzzkAuthStore.getState().clearTokens(); });
  axiosInstance.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config,
      data: { code: 200, message: null, content: { accessToken: 'user-token', refreshToken: 'refresh-token', url: 'wss://example.invalid/socket', data: [] } } };
  };
  chzzkAuthStore.getState().setTokens({ accessToken: 'user-token', refreshToken: 'refresh-token' });
  const credentials = { clientId: 'public-id', clientSecret: 'manual-secret' };
  await chzzkAuthApi.getAccessToken({ ...credentials, code: 'oauth-code', state: 'oauth-state' });
  await chzzkAuthApi.refreshAccessToken({ ...credentials, refreshToken: 'refresh-token' });
  await chzzkAuthApi.revokeAccessToken({ clientId: 'public-id', token: 'user-token', tokenTypeHint: 'access_token' });
  await chzzkChannelApi.getUserInfo();
  await chzzkChannelApi.getChannelInfo('channel-id', credentials);
  await chzzkSessionApi.createClientSession();
  await chzzkSessionApi.subscribeToChat({ sessionKey: 'session-key&private' });
  await chzzkSessionApi.subscribeToDonation({ sessionKey: 'session-key&private' });
  await chzzkSessionApi.subscribeToSubscription({ sessionKey: 'session-key&private' });

  assert.deepEqual(requests.map(({ method, url }) => `${method?.toUpperCase()} ${url}`), [
    'POST /api/chzzk/auth/v1/token',
    'POST /api/chzzk/auth/v1/token',
    'POST /api/chzzk/auth/v1/token/revoke',
    'GET /api/chzzk/open/v1/users/me',
    'GET /api/chzzk/open/v1/channels?channelIds=channel-id',
    'GET /api/chzzk/open/v1/sessions/auth',
    'POST /api/chzzk/open/v1/sessions/events/subscribe/chat?sessionKey=session-key%26private',
    'POST /api/chzzk/open/v1/sessions/events/subscribe/donation?sessionKey=session-key%26private',
    'POST /api/chzzk/open/v1/sessions/events/subscribe/subscription?sessionKey=session-key%26private',
  ]);
  assert.deepEqual(requests.slice(0, 3).map(({ data }) => JSON.parse(data)), [
    { grantType: 'authorization_code', clientId: 'public-id', code: 'oauth-code', state: 'oauth-state' },
    { grantType: 'refresh_token', clientId: 'public-id', refreshToken: 'refresh-token' },
    { clientId: 'public-id', token: 'user-token', tokenTypeHint: 'access_token' },
  ]);
  assert.equal(requests[4].headers.get('Client-Id'), undefined);
  assert.equal(requests[4].headers.get('Client-Secret'), undefined);
  assert.ok(!JSON.stringify(requests).includes('manual-secret')); 
  assert.equal(requests[4].headers.get('Authorization'), 'Bearer user-token');
  for (const request of [requests[3], ...requests.slice(5)]) {
    assert.equal(request.headers.get('Authorization'), 'Bearer user-token');
    assert.equal(request.headers.get('Client-Secret'), undefined);
    assert.equal(request.data, undefined);
  }
});

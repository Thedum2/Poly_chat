import assert from 'node:assert/strict';
import test from 'node:test';
import type { InternalAxiosRequestConfig } from 'axios';
import { axiosInstance } from '../src/api/axiosInstance';
import { soopAuthStore } from '../src/store/soopAuthStore';
import { soopAuthApi } from '../src/api/modules/soop/channel';
import { soopTokenApi } from '../src/api/modules/soop/auth';

test('SOOP profile requests use the configured relay without an upstream browser request', async (t) => {
  const requests: InternalAxiosRequestConfig[] = [];
  const previousAdapter = axiosInstance.defaults.adapter;
  t.after(() => {
    axiosInstance.defaults.adapter = previousAdapter;
    soopAuthStore.getState().clearTokens();
  });
  axiosInstance.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config,
      data: { result: 1, data: { user_nick: 'Streamer', profile_image: 'https://example.invalid/profile.jpg' } } };
  };
  soopAuthStore.getState().setTokens({ accessToken: 'user-token', refreshToken: 'refresh-token' });

  const profile = await soopAuthApi.getStationInfo();
  await soopAuthApi.getStationInfo('https://relay.example.test/soop');

  assert.equal(profile.data.user_nick, 'Streamer');
  assert.deepEqual(requests.map(({ method, url, data }) => ({ method, url, data })), [
    { method: 'post', url: '/api/soop/user/stationinfo', data: 'access_token=user-token' },
    { method: 'post', url: 'https://relay.example.test/soop/user/stationinfo', data: 'access_token=user-token' },
  ]);
});

test('SOOP token exchange and refresh send only the grant to the configured server', async (t) => {
  const requests: InternalAxiosRequestConfig[] = [];
  const previousAdapter = axiosInstance.defaults.adapter;
  t.after(() => { axiosInstance.defaults.adapter = previousAdapter; });
  axiosInstance.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config,
      data: { access_token: 'user-token', refresh_token: 'new-refresh-token' } };
  };
  const tokens = await soopTokenApi.getAccessToken('code&private');
  const refreshed = await soopTokenApi.refreshAccessToken('refresh&private', 'https://relay.example.test/soop');
  assert.equal(tokens.access_token, 'user-token');
  assert.equal(refreshed.refresh_token, 'new-refresh-token');
  assert.deepEqual(requests.map(({ method, url, data }) => ({ method, url, data })), [
    { method: 'post', url: '/api/soop/auth/token', data: 'grant_type=authorization_code&code=code%26private' },
    { method: 'post', url: 'https://relay.example.test/soop/auth/token', data: 'grant_type=refresh_token&refresh_token=refresh%26private' },
  ]);
  for (const request of requests) {
    assert.equal(request.headers.get('Content-Type'), 'application/x-www-form-urlencoded');
    assert.equal(request.headers.get('Client-Secret'), undefined);
  }
});

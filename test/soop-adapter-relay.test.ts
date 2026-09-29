import assert from 'node:assert/strict';
import test from 'node:test';
import type { InternalAxiosRequestConfig } from 'axios';
import { SoopAdapter } from '../src/adapters/soop/SoopAdapter';
import { axiosInstance } from '../src/api/axiosInstance';
import { soopAuthStore } from '../src/store/soopAuthStore';

test('SOOP adapter loads the relay SDK and authenticates without exposing a client secret', async (t) => {
  for (const level of ['log', 'info', 'debug', 'warn', 'error'] as const) t.mock.method(console, level, () => {});
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousAxios = axiosInstance.defaults.adapter;
  t.after(() => {
    for (const [name, descriptor] of [['window', previousWindow], ['document', previousDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    axiosInstance.defaults.adapter = previousAxios;
    soopAuthStore.getState().clearTokens();
  });

  const scripts: string[] = [];
  const constructorArguments: string[][] = [];
  const requests: InternalAxiosRequestConfig[] = [];
  let token = '';
  let connected = false;
  let messageListener: ((action: string, message: unknown) => void) | undefined;
  const sdk = {
    getAuth: async () => { throw new Error('Direct SDK token exchange must not be used'); },
    setAuth(value: string) { token = value; },
    async connect() { connected = true; },
    disconnect() { connected = false; },
    handleMessageReceived(listener: typeof messageListener) { messageListener = listener; },
    handleChatClosed() {},
    handleError() {},
  };
  const popup = { closed: false, location: { href: 'http://localhost/callback?code=one-time-code' },
    close() { this.closed = true; } };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    SOOP: { ChatSDK: function (clientId: string, secret: string) {
      constructorArguments.push([clientId, secret]);
      return sdk;
    } },
    open: () => popup,
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => ({}),
    head: { appendChild(script: { src: string; onload: () => void }) {
      scripts.push(script.src);
      queueMicrotask(() => script.onload());
    } },
  } });
  axiosInstance.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, statusText: 'OK', headers: {}, config, data:
      config.url?.endsWith('/auth/token')
        ? { access_token: 'user-token', refresh_token: 'refresh-token' }
        : { result: 1, data: { user_nick: 'Streamer', profile_image: 'https://example.invalid/profile.jpg' } },
    };
  };
  const adapter = new SoopAdapter();
  const messages: unknown[] = [];
  const auth: unknown[] = [];
  adapter.on('error', () => {});
  adapter.on('message', (message) => messages.push(message));
  adapter.on('auth', (profile) => auth.push(profile));
  await adapter.init({ clientId: 'public-client', clientSecret: 'must-never-leak',
    apiBaseUrl: 'https://relay.example.test/soop' });

  assert.deepEqual(scripts, ['https://relay.example.test/soop/sdk.js']);
  assert.deepEqual(constructorArguments, [['public-client', '']]);
  await adapter.authenticate({ clientId: 'public-client', clientSecret: 'must-never-leak' });
  await adapter.connect();

  assert.equal(adapter.isAuthenticated, true);
  assert.equal(adapter.isConnected, true);
  assert.equal(connected, true);
  assert.equal(token, 'user-token');
  assert.deepEqual(auth, [{ nickname: 'Streamer', profileImageUrl: 'https://example.invalid/profile.jpg' }]);
  assert.deepEqual(requests.map(({ method, url, data }) => ({ method, url, data })), [
    { method: 'post', url: 'https://relay.example.test/soop/auth/token', data: 'grant_type=authorization_code&code=one-time-code' },
    { method: 'post', url: 'https://relay.example.test/soop/user/stationinfo', data: 'access_token=user-token' },
  ]);
  assert.equal(JSON.stringify(requests).includes('must-never-leak'), false);
  messageListener?.('MESSAGE', { userNickname: 'Viewer', message: 'hello' });
  assert.equal(messages.length, 1);
  assert.equal((messages[0] as { content: string }).content, 'hello');
  await adapter.logout();
  assert.equal(adapter.isAuthenticated, false);
  assert.equal(adapter.isConnected, false);
  assert.equal(soopAuthStore.getState().accessToken, null);
});

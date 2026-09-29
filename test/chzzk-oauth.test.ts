import assert from 'node:assert/strict';
import test from 'node:test';
import { ChzzkAdapter } from '../src/adapters/chzzk/ChzzkAdapter';
import { chzzkAuthApi } from '../src/api/modules/chzzk/auth';
import { chzzkChannelApi } from '../src/api/modules/chzzk/channel';
import { chzzkAuthStore } from '../src/store/chzzkAuthStore';

test('CHZZK opens a popup before config resolves and rejects a mismatched callback state', async (t) => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const popup = { closed: false, location: { href: 'about:blank' }, close() { this.closed = true; } };
  let opened = 0;
  let releaseConfig!: () => void;
  const configReady = new Promise<void>((resolve) => { releaseConfig = resolve; });
  t.mock.method(chzzkAuthApi, 'getConfig', async () => {
    await configReady;
    return { code: 200, message: null, content: { clientId: 'public-id' } };
  });
  let tokenCalls = 0;
  t.mock.method(chzzkAuthApi, 'getAccessToken', async () => { tokenCalls++; throw new Error('unexpected token request'); });
  globalThis.window = {
    location: { origin: 'https://app.example' },
    open() { opened++; return popup; },
  } as unknown as Window & typeof globalThis;
  globalThis.document = {} as Document;
  t.after(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });

  const adapter = new ChzzkAdapter();
  adapter.on('error', () => {});
  const pending = adapter.init({ redirectUri: 'https://app.example/callback', apiBaseUrl: '/chzzk' });
  assert.equal(opened, 1);
  releaseConfig();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.match(popup.location.href, /^https:\/\/chzzk\.naver\.com\/account-interlock\?/);
  popup.location.href = 'https://app.example/callback?code=stolen&state=wrong';
  await assert.rejects(pending, /state/i);
  assert.equal(tokenCalls, 0);
  assert.equal(popup.closed, true);
});

test('CHZZK refuses a callback on another origin before opening a popup', async (t) => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let opened = 0;
  globalThis.window = { location: { origin: 'https://app.example' }, open() { opened++; return null; } } as unknown as Window & typeof globalThis;
  globalThis.document = {} as Document;
  t.after(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });
  const adapter = new ChzzkAdapter();
  adapter.on('error', () => {});
  await assert.rejects(adapter.init({ redirectUri: 'https://other.example/callback' }), /origin/i);
  assert.equal(opened, 0);
});

test('CHZZK ignores another path and exchanges only the validated callback code and state', async (t) => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const popup = { closed: false, location: { href: 'about:blank' }, close() { this.closed = true; } };
  globalThis.window = {
    location: { origin: 'https://app.example' }, open() { return popup; },
  } as unknown as Window & typeof globalThis;
  globalThis.document = {} as Document;
  t.after(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });
  t.after(() => chzzkAuthStore.getState().clearTokens());
  t.mock.method(chzzkAuthApi, 'getConfig', async () => ({ code: 200, message: null, content: { clientId: 'public-id' } }));
  const exchanges: unknown[] = [];
  t.mock.method(chzzkAuthApi, 'getAccessToken', async (request) => {
    exchanges.push(request);
    return { code: 200, message: null, content: { accessToken: 'user-token', refreshToken: 'refresh-token' } };
  });
  t.mock.method(chzzkChannelApi, 'getUserInfo', async () => ({ content: { channelId: 'channel-id' } }));
  t.mock.method(chzzkChannelApi, 'getChannelInfo', async () => ({ content: { data: [] } }));
  const adapter = new ChzzkAdapter();
  adapter.on('error', () => {});
  const pending = adapter.init({ redirectUri: 'https://app.example/callback' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const state = new URL(popup.location.href).searchParams.get('state');
  assert.ok(state);
  popup.location.href = `https://app.example/other?code=wrong&state=${state}`;
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(popup.closed, false);
  popup.location.href = `https://app.example/callback?code=valid-code&state=${state}`;
  await pending;
  await adapter.authenticate({});
  assert.deepEqual(exchanges, [{ code: 'valid-code', state }]);
  assert.equal(adapter.isAuthenticated, true);
});

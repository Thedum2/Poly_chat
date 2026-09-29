import assert from 'node:assert/strict';
import test from 'node:test';
import { ChzzkAdapter } from '../src/adapters/chzzk/ChzzkAdapter';
import { chzzkAuthApi } from '../src/api/modules/chzzk/auth';
import { chzzkChannelApi } from '../src/api/modules/chzzk/channel';
import { chzzkAuthStore } from '../src/store/chzzkAuthStore';

test('CHZZK opens the official OAuth popup immediately and rejects a mismatched callback state', async (t) => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const popup = { closed: false, location: { href: 'about:blank' }, close() { this.closed = true; } };
  let opened = 0;
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
  const pending = adapter.init({ clientId: 'public-id', redirectUri: 'https://app.example/callback' });
  assert.equal(opened, 1);
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
  await assert.rejects(adapter.init({ clientId: 'public-id', redirectUri: 'https://other.example/callback' }), /origin/i);
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
  const exchanges: unknown[] = [];
  t.mock.method(chzzkAuthApi, 'getAccessToken', async (request) => {
    exchanges.push(request);
    return { code: 200, message: null, content: { accessToken: 'user-token', refreshToken: 'refresh-token' } };
  });
  t.mock.method(chzzkChannelApi, 'getUserInfo', async () => ({ content: { channelId: 'channel-id' } }));
  t.mock.method(chzzkChannelApi, 'getChannelInfo', async () => ({ content: { data: [] } }));
  const adapter = new ChzzkAdapter();
  adapter.on('error', () => {});
  const pending = adapter.init({ clientId: 'public-id', redirectUri: 'https://app.example/callback' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const state = new URL(popup.location.href).searchParams.get('state');
  assert.ok(state);
  popup.location.href = `https://app.example/other?code=wrong&state=${state}`;
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(popup.closed, false);
  popup.location.href = `https://app.example/callback?code=valid-code&state=${state}`;
  await pending;
  await adapter.authenticate({ clientSecret: 'manual-secret' });
  assert.deepEqual(exchanges, [{ clientId: 'public-id', code: 'valid-code', state }]);
  assert.equal(adapter.isAuthenticated, true);
  assert.ok(!popup.location.href.includes('manual-secret'));
  await adapter.logout();
  assert.equal(adapter.isAuthenticated, false);
  assert.equal(chzzkAuthStore.getState().accessToken, null);
});

test('CHZZK popup errors do not print request credentials', async (t) => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const popup = { closed: false, location: { href: 'about:blank' }, close() { this.closed = true; } };
  globalThis.window = { location: { origin: 'https://app.example' }, open() { return popup; } } as unknown as Window & typeof globalThis;
  globalThis.document = {} as Document;
  t.after(() => { globalThis.window = originalWindow; globalThis.document = originalDocument; });
  const logs: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => logs.push(args));
  t.mock.method(chzzkAuthApi, 'getAuthCodeUrl', () => {
    throw Object.assign(new Error('test-private-token'), { response: { status: 503 }, config: { headers: { Authorization: 'Bearer test-private-token' } } });
  });
  const adapter = new ChzzkAdapter();
  adapter.on('error', () => {});
  await assert.rejects(adapter.init({ clientId: 'public-id', redirectUri: 'https://app.example/callback' }));
  assert.equal(popup.closed, true);
  assert.ok(!JSON.stringify(logs).includes('test-private-token'));
  assert.match(JSON.stringify(logs), /503/);
});

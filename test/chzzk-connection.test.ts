import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test, { type TestContext } from 'node:test';
import ts from 'typescript';
import type { ChzzkAdapter } from '../src/adapters/chzzk/ChzzkAdapter';

const adapterFile = new URL('../src/adapters/chzzk/ChzzkAdapter.ts', import.meta.url);
const requireFromAdapter = createRequire(adapterFile);
const adapterCode = ts.transpileModule(readFileSync(adapterFile, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

async function setup(t: TestContext, failures: Record<string, number> = {}) {
  for (const level of ['log', 'debug', 'warn', 'error'] as const) t.mock.method(console, level, () => {});
  const handlers = new Map<string, (...args: any[]) => any>();
  let disconnected = false;
  const socket = {
    connect() {},
    disconnect() { disconnected = true; },
    on(event: string, listener: (...args: any[]) => any) { handlers.set(event, listener); },
  };
  // Replace only the socket transport; exercise the actual adapter and API call sequence.
  const module = { exports: {} as { ChzzkAdapter: new () => ChzzkAdapter } };
  new Function('require', 'module', 'exports', adapterCode)((id: string) =>
    id === '../../sio/singleton'
      ? { getSocket: () => socket, destroySocket: () => socket.disconnect() }
      : requireFromAdapter(id), module, module.exports);
  const { chzzkAuthApi } = requireFromAdapter('../../api/modules/chzzk/auth');
  const { chzzkChannelApi } = requireFromAdapter('../../api/modules/chzzk/channel');
  const { chzzkSessionApi } = requireFromAdapter('../../api/modules/chzzk/session');
  const { chzzkAuthStore } = requireFromAdapter('../../store/chzzkAuthStore');
  t.after(() => chzzkAuthStore.getState().clearTokens());
  t.mock.method(chzzkAuthApi, 'getAccessToken', async () => ({
    content: { accessToken: 'test-token', refreshToken: 'test-refresh' },
  }));
  t.mock.method(chzzkChannelApi, 'getUserInfo', async () => ({ content: { channelId: 'test-channel' } }));
  t.mock.method(chzzkChannelApi, 'getChannelInfo', async () => ({ content: { data: [] } }));
  t.mock.method(chzzkSessionApi, 'createClientSession', async () => ({ content: { url: 'https://example.invalid' } }));
  const requests: string[] = [];
  for (const [method, event] of [
    ['subscribeToChat', 'chat'],
    ['subscribeToDonation', 'donation'],
    ['subscribeToSubscription', 'subscription'],
  ]) {
    t.mock.method(chzzkSessionApi, method, async () => {
      requests.push(event);
      if (failures[event]) throw Object.assign(new Error(`${event} failed`), {
        response: { status: failures[event] },
      });
    });
  }
  const adapter = new module.exports.ChzzkAdapter();
  (adapter as any).clientId = 'test-client-id';
  (adapter as any).code = 'test-code';
  (adapter as any).state = 'test-state';
  const errors: Error[] = [];
  let connectedEvents = 0;
  let disconnectedEvents = 0;
  adapter.on('error', (error: Error) => errors.push(error));
  adapter.on('connected', () => connectedEvents++);
  adapter.on('disconnected', () => disconnectedEvents++);
  await adapter.authenticate({ clientSecret: 'test-secret' });
  await adapter.connect();
  return {
    adapter, requests, errors,
    isDisconnected: () => disconnected,
    connectedEvents: () => connectedEvents,
    disconnectedEvents: () => disconnectedEvents,
    onSessionConnected: () => handlers.get('SYSTEM')!(JSON.stringify({
      type: 'connected', data: { sessionKey: 'test-session' },
    })),
  };
}

test('CHZZK remains connected to chat when optional event scopes are forbidden', async (t) => {
  const state = await setup(t, { donation: 403, subscription: 403 });
  await assert.doesNotReject(state.onSessionConnected);
  assert.equal(state.adapter.isConnected, true);
  assert.equal(state.connectedEvents(), 1);
  assert.deepEqual(state.requests, ['chat', 'donation', 'subscription']);
  assert.deepEqual(state.errors, []);
  assert.equal(state.isDisconnected(), false);
});

test('CHZZK subscribes to all events when all scopes are available', async (t) => {
  const state = await setup(t);
  await state.onSessionConnected();
  assert.equal(state.adapter.isConnected, true);
  assert.deepEqual(state.requests, ['chat', 'donation', 'subscription']);
});

test('CHZZK reports required chat subscription failure without an unhandled rejection', async (t) => {
  const state = await setup(t, { chat: 403 });
  await assert.doesNotReject(state.onSessionConnected);
  assert.equal(state.adapter.isConnected, false);
  assert.equal(state.connectedEvents(), 0);
  assert.deepEqual(state.requests, ['chat']);
  assert.equal(state.errors.length, 1);
  assert.equal(state.errors[0].message, 'chat failed');
  assert.equal(state.isDisconnected(), true);
});

test('CHZZK does not treat optional event server errors as missing scopes', async (t) => {
  const state = await setup(t, { donation: 500 });
  await assert.doesNotReject(state.onSessionConnected);
  assert.equal(state.adapter.isConnected, false);
  assert.equal(state.connectedEvents(), 0);
  assert.equal(state.errors.length, 1);
  assert.equal(state.errors[0].message, 'donation failed');
  assert.equal(state.isDisconnected(), true);
});

test('CHZZK notifies consumers when resubscription disconnects an established connection', async (t) => {
  const failures: Record<string, number> = {};
  const state = await setup(t, failures);
  await state.onSessionConnected();
  assert.equal(state.adapter.isConnected, true);
  failures.chat = 403;
  await state.onSessionConnected();
  assert.equal(state.adapter.isConnected, false);
  assert.equal(state.disconnectedEvents(), 1);
  assert.equal(state.errors.length, 1);
});

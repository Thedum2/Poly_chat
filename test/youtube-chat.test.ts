import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test, { type TestContext } from 'node:test';
import { YouTubeAdapter } from '../src/adapters/youtube/YouTubeAdapter';
import { youtubeChannelApi } from '../src/api/modules/youtube/channel';
import { youtubeLiveBroadcastApi } from '../src/api/modules/youtube/liveBroadcast';
import { youtubeLiveChatApi } from '../src/api/modules/youtube/liveChat';
import { youtubeLiveChatStream, YouTubeStreamError, type YouTubeStreamOptions } from '../src/api/modules/youtube/liveChatStream';
import { youtubeAuthStore } from '../src/store/youtubeAuthStore';
import type { LiveChatMessage } from '../src/api/model/youtube/liveChat';
import type { ChatMessage } from '../src/models/ChatMessage';

const CONNECTED_AT = Date.parse('2026-09-29T12:00:00.000Z');
function message(content: string, time: number): LiveChatMessage {
  return { kind: 'youtube#liveChatMessage', etag: '', id: content, snippet: {
    type: 'textMessageEvent', liveChatId: 'test-chat', authorChannelId: 'test-author',
    publishedAt: new Date(time).toISOString(), hasDisplayContent: true,
    textMessageDetails: { messageText: content },
  } };
}

async function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: CONNECTED_AT });
  for (const level of ['log', 'debug', 'warn', 'error'] as const) t.mock.method(console, level, () => {});
  t.mock.method(youtubeChannelApi, 'getChannelInfo', async () => ({ items: [] }));
  t.mock.method(youtubeLiveBroadcastApi, 'listLiveBroadcasts', async () => ({ items: [{ snippet: { liveChatId: 'test-chat' } }] }));
  t.mock.method(youtubeLiveChatApi, 'listLiveChatMessages', async () => { throw new Error('REST polling must not be used'); });
  const streams: { options: YouTubeStreamOptions; end: () => void; fail: (error: Error) => void }[] = [];
  t.mock.method(youtubeLiveChatStream, 'receive', (options: YouTubeStreamOptions) => new Promise<void>((resolve, reject) => {
    streams.push({ options, end: resolve, fail: reject });
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }));
  youtubeAuthStore.getState().setTokens({ accessToken: 'test-token', refreshToken: '' });
  const adapter = new YouTubeAdapter();
  const messages: ChatMessage[] = [];
  const errors: Error[] = [];
  adapter.on('message', (item: ChatMessage) => messages.push(item));
  adapter.on('error', (error: Error) => errors.push(error));
  t.after(async () => { await adapter.disconnect(); youtubeAuthStore.getState().clearTokens(); });
  await adapter.authenticate({});
  async function connect() {
    const pending = adapter.connect();
    void pending.catch(() => {});
    await setImmediate();
    const stream = streams.at(-1);
    assert.ok(stream, 'opens a realtime stream');
    stream.options.onReady();
    await pending;
    return stream;
  }
  return { adapter, messages, errors, streams, connect };
}

test('YouTube stream filters history on every batch and preserves message IDs', async (t) => {
  const state = await setup(t);
  const stream = await state.connect();
  stream.options.onBatch({ items: [message('history', CONNECTED_AT - 1), message('at connection', CONNECTED_AT)] });
  stream.options.onBatch({ items: [message('late history', CONNECTED_AT - 100), message('new', CONNECTED_AT + 100)] });
  assert.deepEqual(state.messages.map(item => item.content), ['at connection', 'new']);
  assert.equal(state.messages[1].chat_id, 'new');
  t.mock.timers.tick(60000);
  await setImmediate();
  assert.equal(state.streams.length, 1, 'does not reopen a healthy stream on a timer');
});

test('connect waits for upstream readiness and permission errors reject without retrying', async (t) => {
  const state = await setup(t);
  const pending = state.adapter.connect();
  const rejected = assert.rejects(pending, /permission/);
  await setImmediate();
  assert.equal(state.adapter.isConnected, false);
  state.streams[0].fail(new YouTubeStreamError('permission', 7, false));
  await rejected;
  t.mock.timers.tick(60000);
  await setImmediate();
  assert.equal(state.streams.length, 1);
  assert.equal(state.errors.length, 1);
});

test('transient stream failure resumes the cursor, keeps cutoff and suppresses replay', async (t) => {
  const state = await setup(t);
  const first = await state.connect();
  first.options.onBatch({ items: [message('first', CONNECTED_AT)], nextPageToken: 'resume-cursor' });
  first.fail(new YouTubeStreamError('unavailable', 14, true));
  await setImmediate();
  t.mock.timers.tick(1000);
  await setImmediate();
  assert.equal(state.streams.length, 2);
  const second = state.streams[1];
  assert.equal(second.options.pageToken, 'resume-cursor');
  second.options.onReady();
  second.options.onBatch({ items: [message('first', CONNECTED_AT), message('during reconnect', CONNECTED_AT + 500)] });
  assert.deepEqual(state.messages.map(item => item.content), ['first', 'during reconnect']);
  assert.equal(state.adapter.isConnected, true);
});

test('manual reconnect resets cutoff and ignores callbacks from the old connection', async (t) => {
  const state = await setup(t);
  const old = await state.connect();
  await state.adapter.disconnect();
  t.mock.timers.tick(6000);
  const current = await state.connect();
  old.options.onBatch({ items: [message('stale', CONNECTED_AT + 6000)], nextPageToken: 'stale' });
  current.options.onBatch({ items: [message('gap', CONNECTED_AT + 2000), message('current', CONNECTED_AT + 6000)], nextPageToken: 'current' });
  assert.equal(current.options.pageToken, undefined);
  assert.deepEqual(state.messages.map(item => item.content), ['current']);
  assert.equal(old.options.signal.aborted, true);
});

test('disconnect settles a pending connect and cancels future retries', async (t) => {
  const state = await setup(t);
  const pending = state.adapter.connect();
  await setImmediate();
  await state.adapter.disconnect();
  await pending;
  state.streams[0].options.onReady();
  state.streams[0].options.onBatch({ items: [message('late', CONNECTED_AT)] });
  t.mock.timers.tick(60000);
  await setImmediate();
  assert.equal(state.adapter.isConnected, false);
  assert.deepEqual(state.messages, []);
  assert.deepEqual(state.errors, []);
  assert.equal(state.streams.length, 1);
});

test('normal stream EOF reconnects but offlineAt terminates reception', async (t) => {
  const state = await setup(t);
  const first = await state.connect();
  first.end();
  await setImmediate();
  t.mock.timers.tick(1000);
  await setImmediate();
  assert.equal(state.streams.length, 2);
  state.streams[1].options.onReady();
  state.streams[1].options.onBatch({ items: [], offlineAt: new Date(CONNECTED_AT).toISOString() });
  await setImmediate();
  t.mock.timers.tick(60000);
  await setImmediate();
  assert.equal(state.adapter.isConnected, false);
  assert.equal(state.streams.length, 2);
});

test('messages sent while broadcast discovery is pending are retained', async (t) => {
  const state = await setup(t);
  let finish!: () => void;
  t.mock.method(youtubeLiveBroadcastApi, 'listLiveBroadcasts', () => new Promise(resolve => {
    finish = () => resolve({ items: [{ snippet: { liveChatId: 'test-chat' } }] });
  }));
  const pending = state.adapter.connect();
  t.mock.timers.tick(5000);
  finish();
  await setImmediate();
  state.streams[0].options.onReady();
  state.streams[0].options.onBatch({ items: [message('during discovery', CONNECTED_AT + 1000)] });
  await pending;
  assert.deepEqual(state.messages.map(item => item.content), ['during discovery']);
});

test('disconnect aborts broadcast discovery before opening a stream', async (t) => {
  const state = await setup(t);
  let signal: AbortSignal | undefined;
  t.mock.method(youtubeLiveBroadcastApi, 'listLiveBroadcasts', (_token: string, _data: unknown, requestSignal?: AbortSignal) => new Promise((_resolve, reject) => {
    signal = requestSignal;
    signal?.addEventListener('abort', () => reject(signal?.reason), { once: true });
  }));
  const pending = state.adapter.connect();
  assert.ok(signal, 'discovery receives the connection abort signal');
  await state.adapter.disconnect();
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(state.streams.length, 0);
  assert.deepEqual(state.errors, []);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { youtubeLiveChatStream, YouTubeStreamError } from '../src/api/modules/youtube/liveChatStream';

test('stream POST keeps credentials out of the URL and decodes split UTF-8 SSE frames', async (t) => {
  const bytes = new TextEncoder().encode(': heartbeat\r\n\r\nevent: ready\r\ndata: {}\r\n\r\nevent: batch\r\ndata: {"items":[],\r\ndata: "nextPageToken":"한글커서"}\r\n\r\nevent: end\r\ndata: {}\r\n\r\n');
  let request: RequestInit | undefined;
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/youtube/chat/stream');
    request = init;
    return new Response(new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 2) controller.enqueue(bytes.slice(i, i + 2));
        controller.close();
      },
    }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const events: unknown[] = [];
  await youtubeLiveChatStream.receive({
    url: '/api/youtube/chat/stream', accessToken: 'private-token', liveChatId: 'chat', pageToken: 'resume',
    signal: new AbortController().signal,
    onReady: () => events.push('ready'), onBatch: (batch) => events.push(batch),
  });
  assert.equal(request?.method, 'POST');
  assert.equal(new Headers(request?.headers).get('Authorization'), 'Bearer private-token');
  assert.deepEqual(JSON.parse(request!.body as string), { liveChatId: 'chat', pageToken: 'resume' });
  assert.deepEqual(events, ['ready', { items: [], nextPageToken: '한글커서' }]);
});

test('relay errors preserve retryability and close the browser reader', async (t) => {
  let cancelled = false;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('event: error\ndata: {"message":"Permission denied","code":7,"retryable":false}\n\n')); },
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'text/event-stream' } }));
  await assert.rejects(youtubeLiveChatStream.receive({
    url: '/stream', accessToken: 'token', liveChatId: 'chat', signal: new AbortController().signal,
    onReady() {}, onBatch() {},
  }), (error: unknown) => error instanceof YouTubeStreamError && error.code === 7 && !error.retryable);
  assert.equal(cancelled, true);
});

test('a missing relay is a terminal configuration error instead of a successful connection', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(youtubeLiveChatStream.receive({
    url: '/missing', accessToken: 'token', liveChatId: 'chat', signal: new AbortController().signal,
    onReady() { assert.fail('not connected'); }, onBatch() {},
  }), (error: unknown) => error instanceof YouTubeStreamError && !error.retryable && /중계/.test(error.message));
});

test('aborting a pending reader closes the stream promptly', async (t) => {
  let cancelled = false;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'Content-Type': 'text/event-stream' } }));
  const abort = new AbortController();
  const pending = youtubeLiveChatStream.receive({
    url: '/stream', accessToken: 'token', liveChatId: 'chat', signal: abort.signal,
    onReady() {}, onBatch() {},
  });
  await new Promise(resolve => setImmediate(resolve));
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(cancelled, true);
});

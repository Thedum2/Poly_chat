import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { createYouTubeStreamHandler } from '../server/youtube-stream';
import { createYouTubeServer } from '../server/youtube-server';

// Independently encode the documented wire tags: sharing the relay's proto here
// would let incorrect tags pass the integration test on both sides.
const fixtureProto = `syntax = "proto2";
package youtube.api.v3;
service V3DataLiveChatMessageService {
  rpc StreamList(Request) returns (stream Response) {}
}
message Request {
  optional string live_chat_id = 1;
  optional string page_token = 99;
  repeated string part = 100;
}
message Response {
  optional string offline_at = 2;
  optional string next_page_token = 100602;
  repeated Item items = 1007;
}
message Item {
  optional string id = 101;
  optional Snippet snippet = 2;
  optional Author author_details = 3;
}
message Snippet {
  enum Type { INVALID_TYPE = 0; TEXT_MESSAGE_EVENT = 1; SUPER_CHAT_EVENT = 15; }
  optional Type type = 1;
  optional string published_at = 4;
  optional string display_message = 16;
  optional Text text_message_details = 19;
}
message Text { optional string message_text = 1; }
message Author {
  optional string channel_id = 10101;
  optional string display_name = 103;
  optional bool is_chat_owner = 5;
}`;
const fixtureDirectory = mkdtempSync(join(tmpdir(), 'youtube-relay-test-'));
const fixturePath = join(fixtureDirectory, 'fixture.proto');
writeFileSync(fixturePath, fixtureProto);
const definition = (() => {
  try { return protoLoader.loadSync(fixturePath, { enums: String, longs: String, defaults: false }); }
  finally { unlinkSync(fixturePath); rmdirSync(fixtureDirectory); }
})();
const service = (grpc.loadPackageDefinition(definition) as any)
  .youtube.api.v3.V3DataLiveChatMessageService.service;

type UpstreamCall = grpc.ServerWritableStream<any, any>;

async function upstream(t: TestContext, handler: (call: UpstreamCall) => void) {
  const server = new grpc.Server();
  server.addService(service, { streamList: handler });
  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) reject(error); else resolve(port);
    });
  });
  t.after(() => server.forceShutdown());
  return { grpcTarget: `127.0.0.1:${port}`, grpcInsecure: true };
}

async function listen(t: TestContext, server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>(resolve => server.close(() => resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}

function post(url: string, body: unknown = { liveChatId: 'chat-id' }, init: RequestInit = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { authorization: 'Bearer test-access-value', 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4_000),
    ...init,
  });
}

function events(text: string) {
  return text.split('\n\n').filter(frame => frame.startsWith('event:')).map(frame => {
    const lines = frame.split('\n');
    return { event: lines[0].slice(7), data: JSON.parse(lines[1].slice(6)) };
  });
}

test('relay sends OAuth and cursor over real gRPC and normalizes protobuf batches to SSE', async t => {
  const options = await upstream(t, call => {
    assert.deepEqual(call.request, {
      liveChatId: 'chat-id', pageToken: 'resume-cursor', part: ['id', 'snippet', 'authorDetails'],
    });
    assert.deepEqual(call.metadata.get('authorization'), ['Bearer test-access-value']);
    call.write({
      nextPageToken: 'next-cursor',
      items: [{
        id: 'message-1',
        snippet: {
          type: 'TEXT_MESSAGE_EVENT', publishedAt: '2026-09-29T06:00:00Z',
          displayMessage: '안녕하세요', textMessageDetails: { messageText: '안녕하세요' },
        },
        authorDetails: { channelId: 'author-1', displayName: 'Alice', isChatOwner: true },
      }],
    });
    call.write({ offlineAt: '2026-09-29T07:00:00Z' });
    call.end();
  });
  const url = await listen(t, createServer(createYouTubeStreamHandler(options)));
  const response = await post(url, { liveChatId: 'chat-id', pageToken: 'resume-cursor' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type')!, /^text\/event-stream/);
  const received = events(await response.text());
  assert.deepEqual(received.map(item => item.event), ['ready', 'batch', 'batch', 'end']);
  assert.deepEqual(received[1].data, {
    nextPageToken: 'next-cursor',
    items: [{
      id: 'message-1',
      snippet: {
        type: 'textMessageEvent', publishedAt: '2026-09-29T06:00:00Z',
        displayMessage: '안녕하세요', textMessageDetails: { messageText: '안녕하세요' },
      },
      authorDetails: { channelId: 'author-1', displayName: 'Alice', isChatOwner: true },
    }],
  });
  assert.deepEqual(received[2].data, { items: [], offlineAt: '2026-09-29T07:00:00Z' });
});

test('relay emits heartbeats while waiting and only becomes ready on upstream data', async t => {
  let call: UpstreamCall | undefined;
  const options = await upstream(t, value => { call = value; });
  const url = await listen(t, createServer(createYouTubeStreamHandler({ ...options, heartbeatIntervalMs: 10 })));
  const response = await post(url);
  const reader = response.body!.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /: heartbeat/);
  assert.doesNotMatch(first, /event: ready/);
  while (!call) await new Promise(resolve => setTimeout(resolve, 5));
  call.end();
  let tail = '';
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    tail += new TextDecoder().decode(chunk.value);
  }
  assert.deepEqual(events(tail), [{ event: 'end', data: {} }]);
});

test('closing the HTTP response cancels the actual upstream gRPC stream', async t => {
  let cancel!: () => void;
  const cancelled = new Promise<void>(resolve => { cancel = resolve; });
  const options = await upstream(t, call => {
    call.on('cancelled', cancel);
    call.write({ nextPageToken: 'cursor' });
  });
  const url = await listen(t, createServer(createYouTubeStreamHandler(options)));
  const controller = new AbortController();
  const response = await post(url, { liveChatId: 'chat-id' }, { signal: controller.signal });
  const reader = response.body!.getReader();
  await reader.read();
  controller.abort();
  await Promise.race([cancelled, new Promise((_, reject) => setTimeout(() => reject(new Error('gRPC did not cancel')), 1_000))]);
});

for (const [code, retryable] of [
  [grpc.status.UNAUTHENTICATED, false], [grpc.status.PERMISSION_DENIED, false],
  [grpc.status.RESOURCE_EXHAUSTED, false], [grpc.status.FAILED_PRECONDITION, false],
  [grpc.status.UNAVAILABLE, true], [grpc.status.DEADLINE_EXCEEDED, true],
] as const) {
  test(`relay classifies upstream gRPC status ${code} and never forwards credentials`, async t => {
    const options = await upstream(t, call => {
      call.emit('error', { code, details: 'Request rejected: Bearer test-access-value' });
    });
    const url = await listen(t, createServer(createYouTubeStreamHandler(options)));
    const response = await post(url);
    const text = await response.text();
    const received = events(text);
    assert.equal(received.length, 1);
    assert.equal(received[0].event, 'error');
    assert.equal(received[0].data.code, code);
    assert.equal(received[0].data.retryable, retryable);
    assert.doesNotMatch(text, /test-access-value/);
    assert.match(received[0].data.message, /Request rejected/);
  });
}

test('relay rejects invalid requests before opening an upstream stream', async t => {
  let calls = 0;
  const options = await upstream(t, call => { calls++; call.end(); });
  const url = await listen(t, createServer(createYouTubeStreamHandler(options)));
  const cases: [unknown, RequestInit, number][] = [
    [{ liveChatId: '' }, {}, 400],
    [{ liveChatId: 'chat', pageToken: 42 }, {}, 400],
    [{ liveChatId: 'chat' }, { headers: { 'content-type': 'application/json' } }, 401],
    [{ liveChatId: 'chat' }, { headers: { authorization: 'Bearer test-value', 'content-type': 'text/plain' } }, 415],
    [{ liveChatId: 'x'.repeat(20_000) }, {}, 413],
    [{ liveChatId: 'chat' }, { body: '{' }, 400],
  ];
  for (const [body, init, status] of cases) {
    const response = await post(url, body, init);
    assert.equal(response.status, status);
    await response.text();
  }
  const get = await fetch(url);
  assert.equal(get.status, 405);
  assert.equal(calls, 0);
});

test('relay bounds buffered output and cancels an oversized upstream batch', async t => {
  let cancel!: () => void;
  const cancelled = new Promise<void>(resolve => { cancel = resolve; });
  const options = await upstream(t, call => {
    call.on('cancelled', cancel);
    call.write({ items: [{ snippet: { displayMessage: 'x'.repeat(8_000) } }] });
  });
  const url = await listen(t, createServer(createYouTubeStreamHandler({ ...options, maxBufferedBytes: 2_048 })));
  const response = await post(url);
  const text = await response.text();
  assert.ok(text.length < 2_048);
  assert.equal(events(text).at(-1)?.data.code, 'SLOW_CONSUMER');
  await cancelled;
});

test('a stalled HTTP reader causes the relay to cancel upstream after its drain timeout', { timeout: 5_000 }, async t => {
  let cancel!: () => void;
  const cancelled = new Promise<void>(resolve => { cancel = resolve; });
  const options = await upstream(t, call => {
    let stopped = false;
    call.once('cancelled', () => { stopped = true; cancel(); });
    const batch = { items: [{ snippet: { displayMessage: 'x'.repeat(256 * 1024) } }] };
    const pump = () => {
      while (!stopped && call.write(batch)) { /* Respect upstream HTTP/2 backpressure too. */ }
    };
    call.on('drain', pump);
    pump();
  });
  const url = await listen(t, createServer(createYouTubeStreamHandler({
    ...options, maxBufferedBytes: 1024 * 1024, drainTimeoutMs: 40,
  })));
  const client = request(url, {
    method: 'POST', headers: { authorization: 'Bearer test-value', 'content-type': 'application/json' },
  });
  client.on('error', () => {});
  t.after(() => client.destroy());
  client.end(JSON.stringify({ liveChatId: 'chat-id' }));
  const [response] = await once(client, 'response');
  response.pause();
  await cancelled;
  assert.equal(response.readableFlowing, false);
  response.destroy();
});

test('standalone route enforces explicit CORS origins and handles preflight', async t => {
  let calls = 0;
  const options = await upstream(t, call => { calls++; call.end(); });
  const url = await listen(t, createYouTubeServer({ ...options, allowedOrigins: ['https://demo.example'] }));
  const preflight = await fetch(`${url}/youtube/chat/stream`, {
    method: 'OPTIONS', headers: { origin: 'https://demo.example', 'access-control-request-method': 'POST' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://demo.example');
  assert.match(preflight.headers.get('access-control-allow-headers')!, /authorization/i);
  const denied = await post(`${url}/youtube/chat/stream`, undefined, {
    headers: { origin: 'https://untrusted.example', authorization: 'Bearer test-value', 'content-type': 'application/json' },
  });
  assert.equal(denied.status, 403);
  assert.equal(calls, 0);
  const accepted = await post(`${url}/youtube/chat/stream`, undefined, {
    headers: { origin: 'https://demo.example', authorization: 'Bearer test-value', 'content-type': 'application/json' },
  });
  assert.equal(accepted.status, 200);
  await accepted.text();
  assert.equal(calls, 1);
  assert.equal((await fetch(`${url}/missing`)).status, 404);
});

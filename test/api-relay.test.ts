import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, request, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { test, type TestContext } from 'node:test';
import * as relayModule from '../server/api-relay';

type RelayOptions = Parameters<typeof relayModule.createApiRelayHandler>[0];
const credentials = {
  chzzk: { clientId: 'chzzk-public', clientSecret: 'chzzk-private' },
  soop: { clientId: 'soop-public', clientSecret: 'soop-private' },
  youtube: { clientId: 'youtube-public' },
};
const bearer = { authorization: 'Bearer caller-access-token' };

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

async function setup(t: TestContext, handle?: (req: IncomingMessage, res: ServerResponse) => void, options: RelayOptions = {}) {
  const upstream = await listen(t, createServer(handle ?? ((_req, res) => res.end('{"ok":true}'))));
  const base = await listen(t, createServer(relayModule.createApiRelayHandler({
    credentials, upstreams: { chzzk: upstream, soop: upstream, youtube: upstream }, ...options,
  })));
  return { base, upstream };
}

function jsonPost(url: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('public configuration reveals only client IDs and is never cached', async t => {
  const { base } = await setup(t);
  const response = await fetch(`${base}/config`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    chzzk: { clientId: 'chzzk-public' }, soop: { clientId: 'soop-public' }, youtube: { clientId: 'youtube-public' },
  });
});

test('CHZZK exchange injects server credentials and does not forward cookies or arbitrary headers', async t => {
  let received: unknown;
  const { base } = await setup(t, (req, res) => { void (async () => {
    received = { url: req.url, method: req.method, headers: req.headers, body: JSON.parse(await body(req)) };
    res.writeHead(201, { 'content-type': 'application/json', 'set-cookie': 'upstream=secret', 'x-upstream': 'private' });
    res.end('{"content":{"accessToken":"new-access","refreshToken":"new-refresh"}}');
  })(); });
  const response = await jsonPost(`${base}/chzzk/auth/v1/token`, { grantType: 'authorization_code', code: 'code-value', state: 'state-value', clientId: 'chzzk-public' }, { cookie: 'session=private', 'x-untrusted': 'value' });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { content: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
  const observed = received as any;
  assert.equal(observed.url, '/auth/v1/token');
  assert.equal(observed.method, 'POST');
  assert.deepEqual(observed.body, { grantType: 'authorization_code', code: 'code-value', state: 'state-value', clientId: 'chzzk-public', clientSecret: 'chzzk-private' });
  assert.equal(observed.headers.cookie, undefined);
  assert.equal(observed.headers['x-untrusted'], undefined);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('x-upstream'), null);
});

test('CHZZK refresh and revoke inject credentials but reject browser secrets or client mismatches', async t => {
  const seen: any[] = [];
  const { base } = await setup(t, (req, res) => { void (async () => {
    seen.push(JSON.parse(await body(req))); res.end('{"content":{}}');
  })(); });
  for (const [path, payload] of [
    ['/auth/v1/token', { grantType: 'refresh_token', refreshToken: 'refresh-value' }],
    ['/auth/v1/token/revoke', { token: 'revoke-value', tokenTypeHint: 'access_token' }],
  ] as const) {
    const response = await jsonPost(`${base}/chzzk${path}`, payload);
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  assert.deepEqual(seen, [
    { grantType: 'refresh_token', refreshToken: 'refresh-value', clientId: 'chzzk-public', clientSecret: 'chzzk-private' },
    { token: 'revoke-value', tokenTypeHint: 'access_token', clientId: 'chzzk-public', clientSecret: 'chzzk-private' },
  ]);
  for (const payload of [{ clientId: 'different' }, { clientSecret: 'browser-secret' }]) {
    const response = await jsonPost(`${base}/chzzk/auth/v1/token`, { grantType: 'authorization_code', code: 'code', state: 'state', ...payload });
    assert.equal(response.status, 400);
    await response.arrayBuffer();
  }
  assert.equal(seen.length, 2);
});

test('CHZZK protected routes relay bearer and inject channel credentials', async t => {
  const seen: any[] = [];
  const { base } = await setup(t, (req, res) => {
    seen.push({ url: req.url, method: req.method, authorization: req.headers.authorization, clientId: req.headers['client-id'], clientSecret: req.headers['client-secret'] });
    res.end('{"content":{}}');
  });
  for (const path of ['/open/v1/users/me', '/open/v1/channels?channelIds=channel-1&channelIds=channel-2', '/open/v1/sessions/auth']) {
    const response = await fetch(`${base}/chzzk${path}`, { headers: bearer });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  for (const action of ['subscribe', 'unsubscribe']) for (const event of ['chat', 'donation', 'subscription']) {
    const response = await fetch(`${base}/chzzk/open/v1/sessions/events/${action}/${event}?sessionKey=session%2Bkey`, { method: 'POST', headers: bearer });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  assert.equal(seen.length, 9);
  assert.ok(seen.filter((_, i) => i !== 1).every(item => item.authorization === 'Bearer caller-access-token'));
  assert.equal(seen[1].authorization, undefined);
  assert.equal(seen[1].clientId, 'chzzk-public');
  assert.equal(seen[1].clientSecret, 'chzzk-private');
  assert.ok(seen.filter((_, i) => i !== 1).every(item => !item.clientSecret));
  assert.equal(seen[3].url, '/open/v1/sessions/events/subscribe/chat?sessionKey=session%2Bkey');
  assert.equal(seen[3].method, 'POST');
});

test('YouTube routes preserve allowed query values, upstream status, and structured reasons', async t => {
  const seen: string[] = [];
  const { base } = await setup(t, (req, res) => {
    seen.push(req.url!);
    assert.equal(req.headers.authorization, 'Bearer caller-access-token');
    res.writeHead(403, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 403, message: 'Forbidden', errors: [{ reason: 'liveChatDisabled' }] } }));
  });
  for (const path of ['/youtube/v3/channels?part=snippet&mine=true', '/youtube/v3/liveBroadcasts?part=snippet&mine=true', '/youtube/v3/liveChat/messages?liveChatId=chat-id&part=snippet%2CauthorDetails&maxResults=200&pageToken=cursor']) {
    const response = await fetch(`${base}/youtube${path}`, { headers: bearer });
    assert.equal(response.status, 403);
    assert.deepEqual((await response.json()).error.errors, [{ reason: 'liveChatDisabled' }]);
  }
  assert.deepEqual(seen, ['/youtube/v3/channels?part=snippet&mine=true', '/youtube/v3/liveBroadcasts?part=snippet&mine=true', '/youtube/v3/liveChat/messages?liveChatId=chat-id&part=snippet%2CauthorDetails&maxResults=200&pageToken=cursor']);
});

test('CORS rejects unknown origins, allows configured and same origin, and validates preflight', async t => {
  let calls = 0;
  const { base } = await setup(t, (_req, res) => { calls++; res.end('{}'); }, { allowedOrigins: ['https://app.example'] });
  for (const origin of ['https://evil.example', 'null', base.replace('http:', 'https:')]) {
    const response = await fetch(`${base}/config`, { headers: { origin } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    await response.arrayBuffer();
  }
  for (const origin of ['https://app.example', base]) {
    const response = await fetch(`${base}/config`, { headers: { origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.match(response.headers.get('vary')!, /Origin/);
    await response.arrayBuffer();
  }
  const response = await fetch(`${base}/youtube/youtube/v3/channels`, { method: 'OPTIONS', headers: { origin: 'https://app.example', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization, content-type' } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example');
  assert.equal(response.headers.get('access-control-allow-credentials'), null);
  const invalid = await fetch(`${base}/youtube/youtube/v3/channels`, { method: 'OPTIONS', headers: { origin: 'https://app.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'cookie' } });
  assert.equal(invalid.status, 400);
  await invalid.arrayBuffer();
  assert.equal(calls, 0);
});

test('unknown paths, methods, auth, and query parameters fail before contacting upstream', async t => {
  let calls = 0;
  const { base } = await setup(t, (_req, res) => { calls++; res.end('{}'); });
  const cases: Array<[string, RequestInit, number]> = [
    ['/youtube/youtube/v3/channels', {}, 401],
    ['/youtube/youtube/v3/channels', { headers: { authorization: 'Basic abc' } }, 401],
    ['/youtube/youtube/v3/channels', { method: 'DELETE', headers: bearer }, 405],
    ['/youtube/youtube/v3/videos', { headers: bearer }, 404],
    ['/youtube/youtube/v3/channels?access_token=secret', { headers: bearer }, 400],
    ['/youtube/youtube/v3/channels?url=https://evil.example', { headers: bearer }, 400],
    ['/chzzk/open/v1/sessions/events/subscribe/chat', { method: 'POST', headers: bearer }, 400],
    ['/chzzk/open/v1/sessions/events/subscribe/chat?sessionKey=a&sessionKey=b', { method: 'POST', headers: bearer }, 400],
  ];
  for (const [path, init, status] of cases) {
    const response = await fetch(`${base}${path}`, init);
    assert.equal(response.status, status, path);
    await response.arrayBuffer();
  }
  assert.equal(calls, 0);
});

test('raw traversal, absolute URLs and escaped paths cannot become relay destinations', async t => {
  let calls = 0;
  const { base } = await setup(t, (_req, res) => { calls++; res.end('{}'); });
  for (const path of ['/chzzk/../youtube/youtube/v3/channels', '/chzzk/%2e%2e/youtube/youtube/v3/channels', '//evil.example/youtube/youtube/v3/channels', 'http://evil.example/youtube/youtube/v3/channels', '/youtube/youtube/v3/%63hannels', '/chzzk\\..\\youtube/youtube/v3/channels']) {
    const status = await new Promise<number>((resolve, reject) => {
      const call = request(base, { path, headers: bearer }, response => { response.resume(); response.on('end', () => resolve(response.statusCode!)); });
      call.on('error', reject); call.end();
    });
    assert.ok(status >= 400 && status < 500, `${path}: ${status}`);
  }
  assert.equal(calls, 0);
});

test('upstream redirects are refused without forwarding credentials to the redirect target', async t => {
  let leaked = false;
  const target = await listen(t, createServer((_req, res) => { leaked = true; res.end('{}'); }));
  const { base } = await setup(t, (_req, res) => { res.writeHead(302, { location: target }); res.end(); });
  const response = await fetch(`${base}/youtube/youtube/v3/channels`, { headers: bearer });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('location'), null);
  await response.arrayBuffer();
  assert.equal(leaked, false);
});

test('error diagnostics redact configured secrets and submitted OAuth values', async t => {
  const { base } = await setup(t, (_req, res) => {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { reason: 'invalid_grant', message: 'chzzk-private soop-private refresh-value Bearer caller-access-token' } }));
  });
  const response = await jsonPost(`${base}/chzzk/auth/v1/token`, { grantType: 'refresh_token', refreshToken: 'refresh-value' }, bearer);
  assert.equal(response.status, 401);
  const error = await response.json();
  assert.equal(error.error.reason, 'invalid_grant');
  assert.doesNotMatch(JSON.stringify(error), /chzzk-private|soop-private|refresh-value|caller-access-token/);
});

test('HTTP 200 provider errors cannot echo submitted tokens outside token exchange responses', async t => {
  const { base } = await setup(t, (_req, res) => {
    res.end(JSON.stringify({ result: -1, message: 'Invalid soop-token', reason: 'invalid_token' }));
  });
  const response = await fetch(`${base}/soop/user/stationinfo`, { method: 'POST', body: new URLSearchParams({ access_token: 'soop-token' }) });
  assert.equal(response.status, 200);
  const received = await response.json();
  assert.equal(received.reason, 'invalid_token');
  assert.doesNotMatch(received.message, /soop-token/);
});

test('request and upstream response byte limits stop oversized payloads', async t => {
  let calls = 0;
  const { base } = await setup(t, (_req, res) => { calls++; res.end(JSON.stringify({ message: 'x'.repeat(2 * 1024 * 1024) })); });
  const tooLarge = await jsonPost(`${base}/chzzk/auth/v1/token`, { grantType: 'authorization_code', code: 'x'.repeat(65536), state: 'state' });
  assert.equal(tooLarge.status, 413);
  await tooLarge.arrayBuffer();
  assert.equal(calls, 0);
  const response = await fetch(`${base}/youtube/youtube/v3/channels`, { headers: bearer });
  assert.equal(response.status, 502);
  await response.arrayBuffer();
});

test('upstream timeout returns 504 and disconnects the pending upstream request', async t => {
  let closeUpstream!: () => void;
  const closed = new Promise<void>(resolve => { closeUpstream = resolve; });
  const { base } = await setup(t, (_req, res) => { res.on('close', closeUpstream); }, { timeoutMs: 100 });
  const response = await fetch(`${base}/youtube/youtube/v3/channels`, { headers: bearer });
  assert.equal(response.status, 504);
  await response.arrayBuffer();
  await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('upstream stayed open')), 1000).unref())]);
});

test('client disconnect aborts the corresponding upstream request', { timeout: 3000 }, async t => {
  let onStarted!: () => void;
  let onClosed!: () => void;
  const started = new Promise<void>(resolve => { onStarted = resolve; });
  const closed = new Promise<void>(resolve => { onClosed = resolve; });
  const { base } = await setup(t, (_req, res) => { res.on('close', onClosed); onStarted(); });
  const call = request(`${base}/youtube/youtube/v3/channels`, { headers: bearer });
  call.on('error', () => {}); call.end();
  await started;
  call.destroy();
  await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('upstream stayed open')), 1000).unref())]);
});

test('missing server credentials and malformed request bodies fail before upstream calls', async t => {
  let calls = 0;
  const upstream = (_req: IncomingMessage, res: ServerResponse) => { calls++; res.end('{}'); };
  const missing = await setup(t, upstream, { credentials: {} });
  const noConfig = await jsonPost(`${missing.base}/chzzk/auth/v1/token`, { grantType: 'authorization_code', code: 'code', state: 'state' });
  assert.equal(noConfig.status, 503);
  await noConfig.arrayBuffer();
  const config = await fetch(`${missing.base}/config`);
  assert.deepEqual(await config.json(), { chzzk: { clientId: '' }, soop: { clientId: '' }, youtube: { clientId: '' } });
  const { base } = await setup(t, upstream);
  for (const [payload, contentType, status] of [
    ['{', 'application/json', 400], ['null', 'application/json', 400], ['[]', 'application/json', 400],
    ['{}', 'text/plain', 415], ['{"grantType":"password"}', 'application/json', 400],
  ] as const) {
    const response = await fetch(`${base}/chzzk/auth/v1/token`, { method: 'POST', headers: { 'content-type': contentType }, body: payload });
    assert.equal(response.status, status);
    await response.arrayBuffer();
  }
  assert.equal(calls, 0);
});

test('chunked body limits prevent forwarding when content length is absent', async t => {
  let calls = 0;
  const { base } = await setup(t, (_req, res) => { calls++; res.end('{}'); });
  const response = await new Promise<number>((resolve, reject) => {
    const call = request(`${base}/chzzk/auth/v1/token`, { method: 'POST', headers: { 'content-type': 'application/json' } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode!));
    });
    call.on('error', reject);
    call.write('{"code":"');
    call.write('x'.repeat(64 * 1024));
    call.end('"}');
  });
  assert.equal(response, 413);
  assert.equal(calls, 0);
});

test('same origin can be disabled and forwarded headers cannot grant browser access', async t => {
  const { base } = await setup(t, undefined, { allowSameOrigin: false });
  const response = await fetch(`${base}/config`, { headers: { origin: base } });
  assert.equal(response.status, 403);
  await response.arrayBuffer();
  const other = await setup(t);
  const spoofed = await fetch(`${other.base}/config`, { headers: { origin: 'https://trusted.example', 'x-forwarded-host': 'trusted.example', 'x-forwarded-proto': 'https' } });
  assert.equal(spoofed.status, 403);
  await spoofed.arrayBuffer();
  const cli = await fetch(`${base}/config`);
  assert.equal(cli.status, 200);
  await cli.arrayBuffer();
});

test('SOOP exchanges and refreshes use form credentials while authenticated forms stay private', async t => {
  const seen: any[] = [];
  const { base } = await setup(t, (req, res) => { void (async () => {
    seen.push({ url: req.url, body: Object.fromEntries(new URLSearchParams(await body(req))), contentType: req.headers['content-type'] });
    res.end('{"access_token":"new-token"}');
  })(); });
  for (const [path, form] of [
    ['/auth/token', { grant_type: 'authorization_code', code: 'soop-code' }],
    ['/auth/token', { grant_type: 'refresh_token', refresh_token: 'soop-refresh' }],
    ['/user/stationinfo', { access_token: 'soop-token' }],
    ['/broad/access/chatinfo', { access_token: 'soop-token' }],
  ] as const) {
    const response = await fetch(`${base}/soop${path}`, { method: 'POST', body: new URLSearchParams(form) });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  assert.deepEqual(seen.map(item => item.body), [
    { grant_type: 'authorization_code', code: 'soop-code', client_id: 'soop-public', client_secret: 'soop-private' },
    { grant_type: 'refresh_token', refresh_token: 'soop-refresh', client_id: 'soop-public', client_secret: 'soop-private' },
    { access_token: 'soop-token' }, { access_token: 'soop-token' },
  ]);
  assert.deepEqual(seen.map(item => item.url), ['/auth/token', '/auth/token', '/user/stationinfo', '/broad/access/chatinfo']);
  assert.ok(seen.every(item => item.contentType.startsWith('application/x-www-form-urlencoded')));
});

test('SOOP rejects missing tokens, browser client secrets, and arbitrary form parameters', async t => {
  let calls = 0;
  const { base } = await setup(t, (_req, res) => { calls++; res.end('{}'); });
  for (const [path, form, status] of [
    ['/user/stationinfo', {}, 401],
    ['/auth/token', { grant_type: 'authorization_code', code: 'code', client_secret: 'browser-secret' }, 400],
    ['/auth/token', { grant_type: 'authorization_code', code: 'code', client_id: 'wrong' }, 400],
    ['/broad/access/chatinfo', { access_token: 'token', url: 'https://evil.example' }, 400],
  ] as const) {
    const response = await fetch(`${base}/soop${path}`, { method: 'POST', body: new URLSearchParams(form) });
    assert.equal(response.status, status);
    await response.arrayBuffer();
  }
  assert.equal(calls, 0);
});

test('SOOP SDK is served through a fixed credential-free download and cached after wrapping', async t => {
  let calls = 0;
  const sdkUrl = await listen(t, createServer((req, res) => {
    calls++;
    assert.equal(req.headers.authorization, undefined);
    assert.equal(req.headers.cookie, undefined);
    res.writeHead(200, { 'content-type': 'application/javascript' });
    res.end('window.SDK_FIXTURE = "sdk-source-marker";');
  }));
  const { base } = await setup(t, undefined, { sdkUrl: `${sdkUrl}/official.js` });
  for (let i = 0; i < 2; i++) {
    const response = await fetch(`${base}/soop/sdk.js`, { headers: { ...bearer, cookie: 'private' } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type')!, /javascript/);
    assert.match(await response.text(), /sdk-source-marker/);
  }
  assert.equal(calls, 1);
});

test('YouTube stream delegation shares origin and method checks without consuming the body', async t => {
  let calls = 0;
  const { base } = await setup(t, undefined, {
    youtubeStreamHandler: (req, res) => { void (async () => {
      calls++;
      assert.equal(req.url, '/youtube/chat/stream');
      assert.deepEqual(JSON.parse(await body(req)), { liveChatId: 'chat-id' });
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end('event: ready\ndata: {}\n\n');
    })(); },
  });
  const blocked = await jsonPost(`${base}/youtube/chat/stream`, { liveChatId: 'chat-id' }, { ...bearer, origin: 'https://evil.example' });
  assert.equal(blocked.status, 403);
  await blocked.arrayBuffer();
  const wrongMethod = await fetch(`${base}/youtube/chat/stream`);
  assert.equal(wrongMethod.status, 405);
  await wrongMethod.arrayBuffer();
  const preflight = await fetch(`${base}/youtube/chat/stream`, { method: 'OPTIONS', headers: { origin: base, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } });
  assert.equal(preflight.status, 204);
  const response = await jsonPost(`${base}/youtube/chat/stream`, { liveChatId: 'chat-id' }, { ...bearer, origin: base });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), base);
  assert.match(await response.text(), /event: ready/);
  assert.equal(calls, 1);
});

test('CHZZK live status is forwarded to the service API only for valid channel IDs', async t => {
  const seen: string[] = [];
  const service = await listen(t, createServer((req, res) => {
    seen.push(req.url!);
    assert.equal(req.headers.authorization, undefined);
    res.end(JSON.stringify({ code: 200, content: { status: 'OPEN' } }));
  }));
  const { base } = await setup(t, undefined, { chzzkLiveStatusUpstream: service });
  const channelId = 'cf3af0be12fa6912436c4d29331af342';
  const response = await fetch(`${base}/chzzk/live-status?channelId=${channelId}`, { headers: bearer });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).content.status, 'OPEN');
  assert.deepEqual(seen, [`/polling/v2/channels/${channelId}/live-status`]);
  for (const bad of ['../../etc', 'abc', `${channelId}x`]) {
    const rejected = await fetch(`${base}/chzzk/live-status?channelId=${encodeURIComponent(bad)}`);
    assert.equal(rejected.status, 400);
  }
  assert.equal(seen.length, 1);
});

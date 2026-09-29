import type { IncomingMessage, ServerResponse } from 'node:http';
import { wrapSoopSdk } from './soop-sdk';

export interface ApiRelayOptions {
  credentials?: { chzzk?: { clientId: string; clientSecret: string }; soop?: { clientId: string; clientSecret: string }; youtube?: { clientId: string } };
  /** Trusted server configuration only; request input can never select an upstream. */
  upstreams?: Partial<Record<'chzzk' | 'soop' | 'youtube', string>>;
  allowedOrigins?: readonly string[];
  /** Defaults to true. Uses the socket protocol and Host, never forwarded headers. */
  allowSameOrigin?: boolean;
  timeoutMs?: number;
  /** Trusted server configuration only, primarily for local integration tests. */
  sdkUrl?: string;
  /** CHZZK service API origin for the unofficial live-status lookup. Trusted server configuration only. */
  chzzkLiveStatusUpstream?: string;
  /** Optional existing streaming transport, mounted behind the same origin checks. */
  youtubeStreamHandler?: (req: IncomingMessage, res: ServerResponse) => void;
}

type Provider = 'chzzk' | 'soop' | 'youtube';
type BodyKind = 'none' | 'chzzk-token' | 'chzzk-revoke' | 'soop-token' | 'soop-access';
type Route = { method: 'GET' | 'POST'; query: readonly string[]; bearer?: boolean; body?: BodyKind; credentials?: boolean };
const MAX_BODY_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_UPSTREAMS = { chzzk: 'https://openapi.chzzk.naver.com', soop: 'https://openapi.sooplive.com', youtube: 'https://www.googleapis.com' };
const ROUTES: Record<Provider, Record<string, Route>> = {
  chzzk: {
    '/auth/v1/token': { method: 'POST', query: [], body: 'chzzk-token', credentials: true },
    '/auth/v1/token/revoke': { method: 'POST', query: [], body: 'chzzk-revoke', credentials: true },
    '/open/v1/users/me': { method: 'GET', query: [], bearer: true },
    '/open/v1/channels': { method: 'GET', query: ['channelIds'], bearer: true, credentials: true },
    '/open/v1/sessions/auth': { method: 'GET', query: [], bearer: true },
    // Unofficial service API (no Open API equivalent); forwarded to chzzkLiveStatusUpstream.
    '/live-status': { method: 'GET', query: ['channelId'] },
    ...Object.fromEntries(['subscribe', 'unsubscribe'].flatMap(action => ['chat', 'donation', 'subscription'].map(event => [
      `/open/v1/sessions/events/${action}/${event}`, { method: 'POST', query: ['sessionKey'], bearer: true },
    ]))),
  },
  soop: {
    '/auth/token': { method: 'POST', query: [], body: 'soop-token', credentials: true },
    '/user/stationinfo': { method: 'POST', query: [], body: 'soop-access' },
    '/broad/access/chatinfo': { method: 'POST', query: [], body: 'soop-access' },
  },
  youtube: {
    '/youtube/v3/channels': { method: 'GET', query: ['part', 'mine', 'id', 'forHandle', 'forUsername', 'hl', 'maxResults', 'pageToken', 'fields'], bearer: true },
    '/youtube/v3/liveBroadcasts': { method: 'GET', query: ['part', 'mine', 'id', 'broadcastStatus', 'broadcastType', 'maxResults', 'pageToken', 'fields'], bearer: true },
    '/youtube/v3/liveChat/messages': { method: 'GET', query: ['liveChatId', 'part', 'maxResults', 'pageToken', 'hl', 'profileImageSize', 'fields'], bearer: true },
  },
};

class RelayError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function send(res: ServerResponse, status: number, body: string, contentType = 'application/json; charset=utf-8') {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

function parseOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Relay origins must be HTTP(S) origins without credentials, paths, queries or fragments.');
  }
  return url.origin;
}

function checkOrigin(req: IncomingMessage, res: ServerResponse, allowed: Set<string>, sameOrigin: boolean) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (origin === undefined) return;
  let valid = false;
  try { valid = parseOrigin(origin) === origin && allowed.has(origin); } catch { /* Reject malformed and opaque origins. */ }
  if (!valid && sameOrigin && req.headers.host) {
    const protocol = (req.socket as typeof req.socket & { encrypted?: boolean }).encrypted ? 'https:' : 'http:';
    try { valid = parseOrigin(origin) === origin && origin === parseOrigin(`${protocol}//${req.headers.host}`); } catch { /* Invalid Host or Origin. */ }
  }
  if (!valid) throw new RelayError(403, 'This origin is not allowed to use the API relay.');
  res.setHeader('Access-Control-Allow-Origin', origin);
}

function readBody(req: IncomingMessage, signal: AbortSignal): Promise<string> {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw new RelayError(413, 'Request body is too large.');
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    const cleanup = () => {
      req.off('data', onData); req.off('end', onEnd); req.off('error', onError); req.off('aborted', onAborted);
      signal.removeEventListener('abort', onSignal);
    };
    const onError = (error: Error) => { cleanup(); req.resume(); reject(error); };
    const onAborted = () => onError(new RelayError(400, 'Request was aborted.'));
    const onSignal = () => onError(signal.reason);
    const onData = (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) onError(new RelayError(413, 'Request body is too large.'));
      else chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')); };
    req.on('data', onData); req.once('end', onEnd); req.once('error', onError); req.once('aborted', onAborted);
    signal.addEventListener('abort', onSignal, { once: true });
    if (signal.aborted) onSignal();
  });
}

async function readResponse(response: Response): Promise<string> {
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new RelayError(502, 'Upstream response is too large.');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RelayError(502, 'Upstream response is too large.');
      }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

function textField(data: Record<string, unknown>, name: string, status = 400): string {
  const value = data[name];
  if (typeof value !== 'string' || !value.trim() || value.length > 8192 || /[\x00-\x1f\x7f]/.test(value)) {
    throw new RelayError(status, `A valid ${name} is required.`);
  }
  return value;
}

function allowFields(data: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new RelayError(400, 'Request contains unsupported parameters.');
}

function prepareBody(raw: string, kind: BodyKind, contentType: string, credential: { clientId: string; clientSecret: string } | undefined, secrets: string[]) {
  let data: Record<string, unknown>;
  const form = kind.startsWith('soop');
  if (form) {
    if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(contentType)) throw new RelayError(415, 'Content-Type must be application/x-www-form-urlencoded.');
    const params = new URLSearchParams(raw);
    if ([...params.keys()].some(key => params.getAll(key).length !== 1)) throw new RelayError(400, 'Duplicate form parameters are not allowed.');
    data = Object.fromEntries(params);
  } else {
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw new RelayError(415, 'Content-Type must be application/json.');
    try { data = JSON.parse(raw); } catch { throw new RelayError(400, 'Request body must contain valid JSON.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RelayError(400, 'Request body must be a JSON object.');
  }
  const clientKey = form ? 'client_id' : 'clientId';
  if (Object.hasOwn(data, 'clientSecret') || Object.hasOwn(data, 'client_secret')) throw new RelayError(400, 'Client secrets must be configured on the server.');
  if (Object.hasOwn(data, clientKey) && data[clientKey] !== credential?.clientId) throw new RelayError(400, 'Client ID does not match the server configuration.');
  if (kind === 'chzzk-token' || kind === 'soop-token') {
    const grantKey = form ? 'grant_type' : 'grantType';
    const refreshKey = form ? 'refresh_token' : 'refreshToken';
    const grant = data[grantKey];
    if (grant === 'authorization_code') {
      allowFields(data, [clientKey, grantKey, 'code', ...(form ? [] : ['state'])]);
      secrets.push(textField(data, 'code'));
      if (!form) secrets.push(textField(data, 'state'));
    } else if (grant === 'refresh_token') {
      allowFields(data, [clientKey, grantKey, refreshKey]);
      secrets.push(textField(data, refreshKey));
    } else throw new RelayError(400, 'Unsupported OAuth grant type.');
  } else if (kind === 'chzzk-revoke') {
    allowFields(data, ['clientId', 'token', 'tokenTypeHint']);
    secrets.push(textField(data, 'token'));
    if (data.tokenTypeHint !== undefined && !['access_token', 'refresh_token'].includes(String(data.tokenTypeHint))) throw new RelayError(400, 'Unsupported token type hint.');
  } else {
    allowFields(data, ['access_token']);
    secrets.push(textField(data, 'access_token', 401));
  }
  if (kind !== 'soop-access') {
    data[clientKey] = credential!.clientId;
    data[form ? 'client_secret' : 'clientSecret'] = credential!.clientSecret;
  }
  return form ? new URLSearchParams(data as Record<string, string>).toString() : JSON.stringify(data);
}

function redact(value: string, secrets: readonly string[]) {
  for (const secret of secrets) if (secret) value = value.split(secret).join('[redacted]');
  return value.replace(/Bearer\s+[^\s,;"}]+/gi, 'Bearer [redacted]');
}

/** Mount beneath a fixed API prefix; req.url must be relative to that mount. */
export function createApiRelayHandler(options: ApiRelayOptions = {}): (req: IncomingMessage, res: ServerResponse) => void {
  const upstreams = Object.fromEntries(Object.entries({ ...DEFAULT_UPSTREAMS, ...options.upstreams }).map(([provider, origin]) => [provider, parseOrigin(origin)])) as Record<Provider, string>;
  const allowedOrigins = new Set((options.allowedOrigins ?? []).map(parseOrigin));
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Relay timeout must be positive.');
  const sdkUrl = new URL(options.sdkUrl ?? 'https://static.sooplive.com/asset/app/chat-sdk/sooplive-chat-sdk.js');
  if (!['https:', 'http:'].includes(sdkUrl.protocol) || sdkUrl.username || sdkUrl.password || sdkUrl.hash) throw new Error('SDK URL must use HTTP(S) without credentials or fragments.');
  const credentials = options.credentials ?? {};
  const configuredSecrets = [credentials.chzzk?.clientSecret, credentials.soop?.clientSecret].filter((value): value is string => Boolean(value));
  let sdkCache: { expires: number; source: string } | undefined;
  const chzzkLiveStatusUpstream = parseOrigin(options.chzzkLiveStatusUpstream ?? 'https://api.chzzk.naver.com');

  return (req, res): void => {
    const controller = new AbortController();
    let timedOut = false;
    let readingRequest = true;
    const abort = () => { if (!res.writableEnded) controller.abort(new RelayError(400, 'Client disconnected.')); };
    req.once('aborted', abort);
    res.once('close', abort);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new RelayError(readingRequest ? 408 : 504, readingRequest ? 'Request body timed out.' : 'Upstream request timed out.'));
    }, timeoutMs);
    timer.unref();
    void (async () => {
      checkOrigin(req, res, allowedOrigins, options.allowSameOrigin !== false);
      const rawUrl = req.url ?? '/';
      const rawPath = rawUrl.split('?')[0];
      if (!rawUrl.startsWith('/') || rawUrl.startsWith('//') || /[\\#\x00-\x20\x7f]/.test(rawUrl) || rawPath.includes('%')) throw new RelayError(400, 'Invalid relay path.');
      const url = new URL(rawUrl, 'http://relay.invalid');
      if (rawPath !== url.pathname) throw new RelayError(400, 'Invalid relay path.');
      const config = url.pathname === '/config';
      const sdk = url.pathname === '/soop/sdk.js';
      const stream = url.pathname === '/youtube/chat/stream' && options.youtubeStreamHandler !== undefined;
      const match = /^\/(chzzk|soop|youtube)(\/.*)$/.exec(url.pathname);
      const provider = match?.[1] as Provider | undefined;
      const path = match?.[2] ?? '';
      const route = config || sdk ? { method: 'GET', query: [] } as Route : stream ? { method: 'POST', query: [] } as Route : provider && Object.hasOwn(ROUTES[provider], path) ? ROUTES[provider][path] : undefined;
      if (!route) throw new RelayError(404, 'API relay route not found.');
      for (const [key, value] of url.searchParams) {
        if (!route.query.includes(key) || !value || value.length > 8192 || (key !== 'channelIds' && url.searchParams.getAll(key).length !== 1)) throw new RelayError(400, 'Unsupported or invalid query parameter.');
      }
      if (req.method === 'OPTIONS') {
        const method = req.headers['access-control-request-method'];
        const headers = String(req.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
        if (!req.headers.origin || method !== route.method || headers.some(header => !['authorization', 'content-type', 'accept'].includes(header))) throw new RelayError(400, 'Unsupported CORS preflight.');
        res.setHeader('Access-Control-Allow-Methods', route.method);
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
        send(res, 204, '');
        return;
      }
      if (req.method !== route.method) {
        res.setHeader('Allow', route.method);
        throw new RelayError(405, 'Method is not allowed for this API route.');
      }
      if (stream) {
        options.youtubeStreamHandler!(req, res);
        return;
      }
      const secrets = [...configuredSecrets];
      const headers: Record<string, string> = { Accept: 'application/json' };
      const authorization = req.headers.authorization;
      const bearer = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(authorization ?? '');
      if (bearer) secrets.push(bearer[1]);
      if (route.bearer) {
        if (!bearer || bearer[1].length > 8192) throw new RelayError(401, 'A valid OAuth Bearer token is required.');
        headers.Authorization = `Bearer ${bearer[1]}`;
      }
      const credential = provider === 'chzzk' ? credentials.chzzk : provider === 'soop' ? credentials.soop : undefined;
      if (route.credentials && (!credential?.clientId || !credential?.clientSecret)) throw new RelayError(503, 'OAuth client credentials are not configured on the server.');
      let requestBody: string | undefined;
      if (route.body) {
        const raw = await readBody(req, controller.signal);
        requestBody = prepareBody(raw, route.body, req.headers['content-type'] ?? '', credential, secrets);
        headers['Content-Type'] = provider === 'soop' ? 'application/x-www-form-urlencoded' : 'application/json';
      } else if (req.headers['transfer-encoding'] || Number(req.headers['content-length']) > 0) {
        throw new RelayError(400, 'This API route does not accept a request body.');
      }
      readingRequest = false;
      if (config) {
        send(res, 200, JSON.stringify({ chzzk: { clientId: credentials.chzzk?.clientId ?? '' }, soop: { clientId: credentials.soop?.clientId ?? '' }, youtube: { clientId: credentials.youtube?.clientId ?? '' } }));
        return;
      }
      if (sdk && sdkCache && sdkCache.expires > Date.now()) {
        send(res, 200, sdkCache.source, 'application/javascript; charset=utf-8');
        return;
      }
      if (provider === 'chzzk' && path === '/open/v1/channels') {
        // This endpoint uses application authentication; the browser bearer is
        // required locally but must not replace the upstream client credentials.
        delete headers.Authorization;
        headers['Client-Id'] = credential!.clientId;
        headers['Client-Secret'] = credential!.clientSecret;
      }
      if (route.query.includes('sessionKey')) secrets.push(textField(Object.fromEntries(url.searchParams), 'sessionKey'));
      let destination = sdk ? sdkUrl : new URL(path + url.search, upstreams[provider!]);
      if (provider === 'chzzk' && path === '/live-status') {
        const channelId = url.searchParams.get('channelId') ?? '';
        if (!/^[0-9a-f]{32}$/i.test(channelId)) throw new RelayError(400, 'A valid channelId is required.');
        destination = new URL(`/polling/v2/channels/${channelId}/live-status`, chzzkLiveStatusUpstream);
      }
      const response = await fetch(destination, { method: route.method, headers: sdk ? { Accept: 'application/javascript' } : headers, body: requestBody, signal: controller.signal, redirect: 'manual', credentials: 'omit' });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        throw new RelayError(502, 'Upstream redirects are not allowed.');
      }
      const responseText = await readResponse(response);
      if (sdk) {
        if (!response.ok) throw new RelayError(502, 'SOOP SDK download failed.');
        const source = wrapSoopSdk(responseText);
        sdkCache = { source, expires: Date.now() + 5 * 60_000 };
        send(res, 200, source, 'application/javascript; charset=utf-8');
        return;
      }
      if (response.status === 204 || response.status === 205) { send(res, response.status, ''); return; }
      let value: unknown;
      try { value = JSON.parse(responseText); } catch {
        if (response.ok) throw new RelayError(502, 'Upstream returned an invalid JSON response.');
        value = { message: responseText || `Upstream returned HTTP ${response.status}.` };
      }
      // Successful token exchange responses intentionally contain newly issued tokens.
      const tokenExchange = route.body === 'chzzk-token' || route.body === 'soop-token';
      const sensitive = response.ok && tokenExchange ? configuredSecrets : secrets;
      const output = JSON.stringify(value, (_key, item) => typeof item === 'string' ? redact(item, sensitive) : item);
      send(res, response.status, output);
    })().catch((error: unknown) => {
      const reason = timedOut ? controller.signal.reason : error;
      const status = reason instanceof RelayError ? reason.status : 502;
      const message = reason instanceof RelayError ? reason.message : 'API upstream request failed.';
      send(res, status, JSON.stringify({ message, code: status }));
      req.resume();
    }).finally(() => {
      clearTimeout(timer);
      req.off('aborted', abort);
      res.off('close', abort);
    });
  };
}

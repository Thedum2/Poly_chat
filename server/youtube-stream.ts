import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

export interface YouTubeStreamOptions {
  /** Override only for trusted server configuration, never from request input. */
  grpcTarget?: string;
  /** Local test services only. Production uses Google's TLS endpoint. */
  grpcInsecure?: boolean;
  protoPath?: string;
  heartbeatIntervalMs?: number;
  maxBufferedBytes?: number;
  drainTimeoutMs?: number;
}

type JsonObject = Record<string, any>;
type StreamClient = grpc.Client & {
  streamList(request: JsonObject, metadata: grpc.Metadata): grpc.ClientReadableStream<JsonObject>;
};
type StreamClientConstructor = new (
  address: string, credentials: grpc.ChannelCredentials, options: grpc.ChannelOptions,
) => StreamClient;

const MAX_BODY_BYTES = 8 * 1024;
const TRANSIENT_CODES = new Set<number>([
  grpc.status.CANCELLED, grpc.status.UNKNOWN, grpc.status.DEADLINE_EXCEEDED,
  grpc.status.ABORTED, grpc.status.INTERNAL, grpc.status.UNAVAILABLE,
]);

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function replyError(res: ServerResponse, status: number, message: string) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ message, code: status, retryable: false }));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const timeout = setTimeout(() => fail(new RequestError(408, 'Request body timed out.')), 15_000);
    timeout.unref();
    const cleanup = () => {
      clearTimeout(timeout);
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('aborted', onAbort);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      chunks.length = 0;
      req.resume();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        fail(new RequestError(413, 'Request body is too large.'));
      } else {
        chunks.push(chunk);
      }
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new RequestError(400, 'Request body must contain valid JSON.')); }
    };
    const onAbort = () => fail(new RequestError(400, 'Request was aborted.'));
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('aborted', onAbort);
    req.once('error', fail);
  });
}

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 4096 && !/[\s\x00-\x1f\x7f]/.test(value);
}

function normalizedBatch(batch: JsonObject) {
  const items = Array.isArray(batch.items) ? batch.items.map((item: JsonObject) => {
    if (!item.snippet || typeof item.snippet.type !== 'string') return item;
    const type = item.snippet.type.toLowerCase().replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
    return { ...item, snippet: { ...item.snippet, type } };
  }) : [];
  return {
    items,
    ...(batch.nextPageToken ? { nextPageToken: batch.nextPageToken } : {}),
    ...(batch.offlineAt ? { offlineAt: batch.offlineAt } : {}),
  };
}

function upstreamError(error: grpc.ServiceError | Error, secrets: string[]) {
  const code = 'code' in error && typeof error.code === 'number' ? error.code : grpc.status.UNKNOWN;
  let message = 'details' in error && typeof error.details === 'string' ? error.details : error.message;
  // Never echo an upstream diagnostic containing the supplied credential/cursor.
  for (const secret of secrets) {
    if (secret) message = message.split(secret).join('[redacted]');
  }
  message = message.replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 1000);
  return { message: message || 'YouTube chat stream failed.', code, retryable: TRANSIENT_CODES.has(code) };
}

/** A POST handler suitable for a path already matched by Vite or another HTTP router. */
export function createYouTubeStreamHandler(options: YouTubeStreamOptions = {}) {
  const protoPath = options.protoPath ?? fileURLToPath(new URL('./youtube-stream.proto', import.meta.url));
  const definition = protoLoader.loadSync(protoPath, { enums: String, longs: String, defaults: false, oneofs: false });
  const packages = grpc.loadPackageDefinition(definition) as any;
  const Client = packages.youtube.api.v3.V3DataLiveChatMessageService as StreamClientConstructor;
  const maxBufferedBytes = options.maxBufferedBytes ?? 1024 * 1024;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000;
  const drainTimeoutMs = options.drainTimeoutMs ?? 30_000;
  if (maxBufferedBytes < 1024 || heartbeatIntervalMs <= 0 || drainTimeoutMs <= 0) {
    throw new Error('Stream buffer and timeout options must be positive (buffer at least 1024 bytes).');
  }

  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      replyError(res, 405, 'Use POST for the YouTube chat stream.');
      return;
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) {
      replyError(res, 415, 'Content-Type must be application/json.');
      req.resume();
      return;
    }
    const authorization = req.headers.authorization;
    const match = /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(authorization ?? '');
    if (!match || match[1].length > 8192) {
      replyError(res, 401, 'A valid YouTube OAuth Bearer token is required.');
      req.resume();
      return;
    }
    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
      replyError(res, 413, 'Request body is too large.');
      req.resume();
      return;
    }

    let client: StreamClient | undefined;
    let call: grpc.ClientReadableStream<JsonObject> | undefined;
    let heartbeat: NodeJS.Timeout | undefined;
    let drainTimeout: NodeJS.Timeout | undefined;
    let closed = false;
    let ending = false;
    let blocked = false;
    let ready = false;
    const stopUpstream = () => {
      call?.cancel();
      client?.close();
      call = undefined;
      client = undefined;
    };
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(drainTimeout);
      stopUpstream();
    };
    res.once('close', cleanup);
    res.once('error', cleanup);
    req.once('aborted', cleanup);

    const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const overflow = () => {
      if (closed || ending) return;
      ending = true;
      clearInterval(heartbeat);
      stopUpstream();
      const errorFrame = frame('error', { message: 'Chat stream exceeded the client output buffer.', code: 'SLOW_CONSUMER', retryable: true });
      if (res.writableLength + Buffer.byteLength(errorFrame) <= maxBufferedBytes) res.end(errorFrame);
      else res.destroy();
    };
    const write = (content: string) => {
      if (closed || res.writableEnded) return false;
      if (res.writableLength + Buffer.byteLength(content) > maxBufferedBytes) {
        overflow();
        return false;
      }
      if (!res.write(content)) {
        blocked = true;
        call?.pause();
        if (!drainTimeout) {
          drainTimeout = setTimeout(() => { cleanup(); res.destroy(); }, drainTimeoutMs);
          drainTimeout.unref();
        }
      }
      return true;
    };
    res.on('drain', () => {
      blocked = false;
      clearTimeout(drainTimeout);
      drainTimeout = undefined;
      if (!ending && !closed) call?.resume();
    });
    const finish = (event: 'error' | 'end', data: unknown) => {
      if (closed || ending) return;
      if (!write(frame(event, data))) return;
      ending = true;
      clearInterval(heartbeat);
      stopUpstream();
      res.end();
    };

    void (async () => {
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new RequestError(400, 'Request body must contain liveChatId.');
      }
      const { liveChatId, pageToken } = body as JsonObject;
      if (!validIdentifier(liveChatId) || (pageToken !== undefined && !validIdentifier(pageToken))) {
        throw new RequestError(400, 'liveChatId and optional pageToken must be nonempty strings of at most 4096 characters.');
      }
      if (closed || res.destroyed || req.aborted) return;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      client = new Client(
        options.grpcTarget ?? 'youtube.googleapis.com:443',
        options.grpcInsecure ? grpc.credentials.createInsecure() : grpc.credentials.createSsl(),
        { 'grpc.max_receive_message_length': 4 * 1024 * 1024 },
      );
      const metadata = new grpc.Metadata();
      metadata.set('authorization', `Bearer ${match[1]}`);
      call = client.streamList({ liveChatId, ...(pageToken ? { pageToken } : {}), part: ['id', 'snippet', 'authorDetails'] }, metadata);
      call.on('data', (batch: JsonObject) => {
        if (ending || closed) return;
        if (!ready) {
          ready = true;
          if (!write(frame('ready', {}))) return;
        }
        write(frame('batch', normalizedBatch(batch)));
      });
      call.on('error', (error: grpc.ServiceError) => finish('error', upstreamError(error, [match[1], pageToken ?? ''])));
      call.on('end', () => finish('end', {}));
      heartbeat = setInterval(() => {
        if (!ending && !blocked) write(': heartbeat\n\n');
      }, heartbeatIntervalMs);
      heartbeat.unref();
    })().catch(error => {
      if (closed) return;
      if (res.headersSent) {
        finish('error', upstreamError(error instanceof Error ? error : new Error('Unable to start YouTube chat stream.'), [match[1]]));
      } else {
        cleanup();
        replyError(res, error instanceof RequestError ? error.status : 500,
          error instanceof RequestError ? error.message : 'Unable to start YouTube chat stream.');
      }
    });
  };
}

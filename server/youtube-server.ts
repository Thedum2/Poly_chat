import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createYouTubeStreamHandler, type YouTubeStreamOptions } from './youtube-stream';

export interface YouTubeServerOptions extends YouTubeStreamOptions {
  allowedOrigins?: readonly string[];
}

/** Standalone relay with an explicit browser-origin allowlist; no token storage. */
export function createYouTubeServer(options: YouTubeServerOptions = {}) {
  const stream = createYouTubeStreamHandler(options);
  const origins = new Set(options.allowedOrigins ?? []);
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('Allowed origins must be exact http(s) origins without a trailing slash.');
    }
  }
  return createServer((req, res) => {
    const path = req.url?.split('?')[0];
    if (path !== '/youtube/chat/stream') {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'This origin is not allowed to use the chat relay.', code: 403, retryable: false }));
      req.resume();
      return;
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      });
      res.end();
      return;
    }
    stream(req, res);
  });
}

// Importing this module for Vite/tests never opens a listener.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.YOUTUBE_STREAM_HOST ?? '127.0.0.1';
  const port = Number(process.env.YOUTUBE_STREAM_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('YOUTUBE_STREAM_PORT must be an integer from 1 to 65535.');
  const allowedOrigins = (process.env.YOUTUBE_STREAM_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  const server = createYouTubeServer({ allowedOrigins });
  server.listen(port, host, () => {
    console.log(`YouTube chat relay listening on http://${host}:${port}/youtube/chat/stream`);
  });
  const shutdown = () => {
    server.close();
    server.closeAllConnections();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

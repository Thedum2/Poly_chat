# YouTube real-time chat

The user approved replacing YouTube polling with the official StreamList server stream, relayed to the React browser over SSE. Preserve OAuth, channel/broadcast discovery, and filtering messages published before the current connection. Keep existing uncommitted changes in this workspace.

## Transport contract

- Browser POSTs JSON `{ liveChatId, pageToken? }` to a configured stream URL, with `Authorization: Bearer <YouTube access token>` and `Content-Type: application/json`.
- Local URL: `/api/youtube/chat/stream`, mounted as Vite middleware. Standalone relay URL: `/youtube/chat/stream`. Production demo defaults to `${VITE_API_URL}/youtube/chat/stream`, with a dedicated `VITE_YOUTUBE_STREAM_URL` override.
- Credentials stay in headers and request memory, never URLs or logs. No token persistence.
- Relay invokes the documented `youtube.api.v3.V3DataLiveChatMessageService/StreamList` on `youtube.googleapis.com:443`, forwarding OAuth metadata. No polling fallback.
- Response is UTF-8 `text/event-stream` with standard SSE framing:
  - `ready`: JSON `{}`; emitted when the upstream returns its first data batch, before that batch.
  - `batch`: JSON `{ items, nextPageToken?, offlineAt? }`; items use existing REST-style camelCase fields and event names (`textMessageEvent`) so the adapter can reuse message mapping.
  - `error`: JSON `{ message: string, code: number|string, retryable: boolean }`; actionable upstream reason without tokens. Permission/auth/quota/precondition errors are fatal; transient transport failures may retry.
  - `end`: JSON `{}`; upstream ended. The browser may resume using the last cursor unless `offlineAt` indicated that the broadcast ended.
- Browser disconnection cancels the gRPC call and closes the client. Relay applies validation, a small request body limit, heartbeats, bounded output buffering, and an allowlist for standalone CORS.

## Browser behavior

- `YouTubeInitOptions.streamUrl?: string` defaults to the local relative relay route. Keep the existing `pollingIntervalSeconds` input deprecated for source compatibility but ignore it.
- Use fetch streaming so Authorization headers and cancellation work; parse chunked SSE without EventSource URL tokens.
- On first `ready`, mark connected and resolve `connect()`. Fatal errors reject a pending connect or report an error/disconnection for an established stream.
- Automatically reconnect transient failures/normal stream endings with bounded exponential backoff and the latest nextPageToken. This is stream reconnection, not timed chat polling.
- Retain the initial cutoff across automatic retries; reset it on explicit reconnect. Filter all batches by publishedAt, deduplicate message IDs with bounded memory, and reject stale callbacks using an abort signal/generation.
- Remove polling interval controls and describe YouTube as real-time in the example UI.

## Validation

Exercise real protobuf serialization against a local fake gRPC service, relay SSE lifecycle and cancellation, streaming parser chunk boundaries/errors/abort, adapter cutoff/reconnect/cursor/deduplication, and the existing OAuth/config/UI suites. Build the library and browser app, restart the demo and verify the relay route is present. A real account stream needs user OAuth/live broadcast; report that limit honestly if unavailable.

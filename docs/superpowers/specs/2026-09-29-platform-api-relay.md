# Three-platform API relay

The user authorized server-side API relay for CHZZK, SOOP and YouTube. Preserve the browser package's adapter/event interface and the existing YouTube streaming transport. Do not commit, publish or deploy. Preserve existing workspace edits.

## Boundaries

- OAuth login pages remain browser popup navigations. Programmatic platform HTTP API calls go to the configured relay, never directly to the provider.
- Each adapter accepts `apiBaseUrl?: string`, a per-platform base defaulting to `/api/chzzk`, `/api/soop`, `/api/youtube`. No mutable global URL configuration. YouTube `streamUrl` remains an optional override and otherwise derives from its API base.
- CHZZK/SOOP secrets live only in relay credentials / server environment. Deprecated clientSecret inputs remain optional for source compatibility and are ignored. Access tokens remain in the existing browser memory stores and are sent only to the configured trusted relay.
- The relay injects server credentials for token exchange and client-auth endpoints. Public GET `/config` returns only client IDs for demo setup, never secrets/tokens.
- CHZZK keeps browser Socket.IO reception after server-side token/profile/session/subscription calls. YouTube retains server gRPC -> browser SSE and moves channel/broadcast REST lookup to the relay too.
- SOOP's official SDK has hidden closed-over HTTP calls and no injectable HTTP client. Serve the official script through `/soop/sdk.js`, wrapping it with a scoped fetch that maps only supported provider API paths to the relay. Do not patch global fetch or use eval. Bootstrap/token/profile HTTP calls must all be relayed; retain SDK websocket behavior. Unsupported SDK HTTP routes fail closed.

## Server

- `createApiRelayHandler(options)` handles relative `/chzzk/...`, `/soop/...`, `/youtube/...`, `/config` routes. `createPolyChatHandler(options)` adds the existing `/youtube/chat/stream` handler. Standalone server listens on 127.0.0.1:3001 by default; Vite mounts the common handler at `/api`.
- Credentials are optional per provider; missing credentials cause actionable configuration errors only for the dependent routes. Configured public client IDs must match submitted IDs.
- Only exact provider method/path/query allowlists; fixed upstream origins from trusted server configuration. No arbitrary destination forwarding, upstream redirects, browser cookies or arbitrary headers. Bound request/response sizes, request timeout, and cancel upstream on disconnect. Preserve provider status/error reason, redact credentials from failures, never log request secrets.
- Explicit origin allowlist for cross-origin callers, same-origin allowed using socket protocol and Host. Handle OPTIONS. TLS termination deployments configure the real frontend origins.
- Export a separate Node-only `polychat-bridge/server` entry and include required protobuf/license assets; root browser entry must bundle without Node dependencies.
- Shared server environment: `CHZZK_CLIENT_ID`, `CHZZK_CLIENT_SECRET`, `SOOP_CLIENT_ID`, `SOOP_CLIENT_SECRET`, `YOUTUBE_CLIENT_ID`, `POLYCHAT_RELAY_HOST`, `POLYCHAT_RELAY_PORT`, `POLYCHAT_ALLOWED_ORIGINS`. Local credentials may be migrated into ignored root `.env.local` without printing their values.

## Verification

Test actual local HTTP relay forwarding, credential injection, auth and CORS, path/redirect rejection, error redaction, sizes/cancellation; preserve real local gRPC tests. Test per-instance URL routing, no browser secrets, SOOP hidden HTTP calls/global-fetch preservation, OAuth regression and demo config. Run all tests, library/server builds, server typecheck, production demo build, npm package consumer checks. Restart demo and smoke-test common routes with synthetic data only. Actual authenticated broadcasts require user login and must not be claimed without validation.

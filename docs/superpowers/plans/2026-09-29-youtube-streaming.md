# YouTube Streaming Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for root integration and superpowers:test-driven-development for each implementation boundary. Independent relay work is delegated using superpowers:dispatching-parallel-agents.

**Goal:** Receive YouTube chat via official gRPC StreamList and an SSE relay, maintaining connection-time filtering.

**Architecture:** A Node relay is reusable in Vite and as a standalone HTTP server. A fetch SSE consumer feeds YouTubeAdapter, which owns message filtering, connection state and stream reconnection.

**Tech Stack:** TypeScript, Node HTTP, @grpc/grpc-js, @grpc/proto-loader, Vite, browser fetch streams, node:test/tsx.

**Spec:** `docs/superpowers/specs/2026-09-29-youtube-streaming.md`

## Constraints

- Work in the current user workspace and preserve unrelated modifications; no commits or deployment.
- Every Windows exec_command uses tty:true.
- Keep credentials out of logs, query strings, test fixtures and checked-in configuration.
- Node-only gRPC code must not enter the browser library bundle.
- No timed polling fallback and no changes to other platforms' transports.

## Tasks

- [x] Relay: add server/youtube-stream.ts with exported createYouTubeStreamHandler, official proto definition, standalone server entrypoint and meaningful local gRPC/SSE tests. Root owns package dependencies/scripts and Vite integration; delegated worker owns server/ and relay test files.
- [x] Browser consumer: add src/api/modules/youtube/liveChatStream.ts and tests for chunked SSE, readiness, batches, fatal/retryable failures and abort.
- [x] Adapter: replace polling with the consumer, bounded cursor-based stream reconnection, cutoff and ID deduplication. Update test/youtube-chat.test.ts to exercise the streaming behavior, preserving OAuth tests.
- [x] Integration: add streamUrl option, environment configuration and config tests; mount relay in Vite and add standalone npm command. Remove obsolete polling controls and update README.
- [x] Verify: run complete tests, library build, demo typecheck and production build; request focused independent review and fix findings.
- [x] Run: restart demo, verify HTTP/SSE route and served client code, report remaining user-owned API permission/live-login requirements.

## Verification results

- `npm test`: 54 passing (44 library/relay, 10 demo).
- `npm run build`, demo development/production builds, and `npm run typecheck:server`: passed.
- Independent review findings fixed and retested: capture cutoff before discovery; cancel discovery and HTTP retry backoff promptly.
- Vite demo restarted at http://localhost:3000; HTTP page, relay authentication rejection, served SSE client, and standalone npm entrypoint verified.
- A synthetic invalid credential reached Google's actual gRPC endpoint and produced terminal UNAUTHENTICATED (16); no real credentials used for this check.
- Actual authenticated live chat reception still requires a user OAuth session and live broadcast. No deployment or commit performed.

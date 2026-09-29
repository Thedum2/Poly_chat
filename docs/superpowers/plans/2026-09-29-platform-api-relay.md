# Platform API Relay Implementation Plan

> Execute root integration inline with executing-plans; dispatch independent server and SOOP implementation using dispatching-parallel-agents. Use meaningful failing tests before behavior changes.

**Goal:** Route all three platforms' browser API calls through a reusable server companion.

**Architecture:** Per-adapter API base -> fixed-route HTTP relay; common host includes YouTube SSE; scoped SOOP SDK fetch handles otherwise hidden direct requests.

**Tech stack:** TypeScript, Node HTTP/fetch, Vite, tsup, existing gRPC and Socket.IO/SDK.

**Spec:** `docs/superpowers/specs/2026-09-29-platform-api-relay.md`

## Constraints and review focus

- Windows exec uses tty:true. No credential output, commits or deployment; retain unrelated user edits.
- No browser secret in requests or SDK constructor; mismatched configured client IDs rejected.
- Independently configured adapter instances must not overwrite each other's route.
- SOOP reconnect/bootstrap cannot escape the relay through hidden SDK fetch.
- Unknown paths, redirects and untrusted origins cannot turn the relay into an open proxy.
- Published Node entry must resolve its proto asset; browser entry must remain browser-bundleable.

## Tasks

- [ ] Server worker: implement `server/api-relay.ts` with typed options and exact allowlist, config route and SOOP SDK route; actual HTTP tests in `test/api-relay.test.ts` including malicious input and cancellation.
- [ ] SOOP worker: implement scoped SDK wrapper, relay script load/auth/profile, tests with fake SDK and official script behavior. Own SOOP adapter/modules/models and new `server/soop-sdk.ts` only.
- [ ] Root browser: add `platformApiUrl(platform,path,base?)`, `apiBaseUrl` options, CHZZK/YT module routing; remove client secret transmission, test distinct bases and OAuth compatibility.
- [ ] Root host/package: common handler/server, local env loading, Node export/build/assets and package consumer checks; keep standalone YouTube compatibility.
- [ ] Root demo: common local/deployed relay bases, public config load, remove secret fields/VITE secret usage, replace stale direct-call documentation, configure local server credentials without exposing them.
- [ ] Verify complete test/build/package suites, independent review, fix findings, restart local demo and probe routes. Record real-account validation limits.

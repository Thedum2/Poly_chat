#!/usr/bin/env node
import { config } from 'dotenv';
import { createPolyChatServer, relayOptionsFromEnv } from './index';

config({ path: '.env.local', quiet: true });
const host = process.env.POLYCHAT_RELAY_HOST || '127.0.0.1';
const port = Number(process.env.POLYCHAT_RELAY_PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('POLYCHAT_RELAY_PORT must be between 1 and 65535.');
const server = createPolyChatServer(relayOptionsFromEnv(process.env));
server.listen(port, host, () => console.log(`PolyChat relay listening on http://${host}:${port}`));
const shutdown = () => { server.close(); server.closeAllConnections(); };
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

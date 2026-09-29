import { createServer } from 'node:http';
import { createApiRelayHandler, type ApiRelayOptions } from './api-relay';
import { createYouTubeStreamHandler, type YouTubeStreamOptions } from './youtube-stream';

export type PolyChatRelayOptions = Omit<ApiRelayOptions, 'youtubeStreamHandler'> & YouTubeStreamOptions;

/** Mount at /api in your application, or use createPolyChatServer on a dedicated host. */
export function createPolyChatHandler(options: PolyChatRelayOptions = {}) {
    return createApiRelayHandler({ ...options, youtubeStreamHandler: createYouTubeStreamHandler(options) });
}

export function createPolyChatServer(options: PolyChatRelayOptions = {}) {
    return createServer(createPolyChatHandler(options));
}

export function relayOptionsFromEnv(env: Record<string, string | undefined>): PolyChatRelayOptions {
    return {
        credentials: {
            chzzk: { clientId: env.CHZZK_CLIENT_ID ?? '', clientSecret: env.CHZZK_CLIENT_SECRET ?? '' },
            soop: { clientId: env.SOOP_CLIENT_ID ?? '', clientSecret: env.SOOP_CLIENT_SECRET ?? '' },
            youtube: { clientId: env.YOUTUBE_CLIENT_ID ?? '' },
        },
        allowedOrigins: (env.POLYCHAT_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean),
    };
}

export { createApiRelayHandler } from './api-relay';
export type { ApiRelayOptions } from './api-relay';

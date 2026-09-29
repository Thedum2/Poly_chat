export type RelayPlatform = 'chzzk' | 'soop' | 'youtube';

/** Per-adapter endpoint; no global configuration shared between consumers. */
export function platformApiUrl(platform: RelayPlatform, path: string, apiBaseUrl?: string): string {
    const base = apiBaseUrl?.trim().replace(/\/+$/, '') || `/api/${platform}`;
    const parsed = new URL(base, 'http://polychat.local');
    if ((!base.startsWith('/') && !/^https?:\/\//i.test(base)) || base.startsWith('//') ||
        !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || base.includes('\\')) {
        throw new Error('apiBaseUrl must be an HTTP(S) URL or an absolute path without credentials, query or fragment.');
    }
    return `${base}/${path.replace(/^\/+/, '')}`;
}

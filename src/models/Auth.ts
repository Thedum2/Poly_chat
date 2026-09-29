export interface InitOptions{
    /** Trusted per-platform relay base. Defaults to /api/{platform}. */
    apiBaseUrl?: string;
}

export interface ChzzkInitOptions extends InitOptions{
    clientId: string;
    redirectUri: string;
}

export interface SoopInitOptions extends InitOptions{
    clientId: string;
    /** @deprecated Configure SOOP_CLIENT_SECRET on the relay server instead. Ignored. */
    clientSecret?: string;
}

export interface YouTubeInitOptions extends InitOptions{
    clientId: string;
    redirectUri: string;
    /** SSE relay endpoint. Defaults to /api/youtube/chat/stream. */
    streamUrl?: string;
    /** @deprecated Chat uses streamList; this option is ignored. */
    pollingIntervalSeconds?: number;
}
export interface AuthOptions {}

export interface YouTubeAuthOptions extends AuthOptions {
}

export interface ChzzkAuthOptions extends AuthOptions {
    /** @deprecated Configure CHZZK_CLIENT_SECRET on the relay server instead. Ignored. */
    clientSecret?: string;
}

export interface SoopAuthOptions extends AuthOptions {
    clientId?: string;
    /** @deprecated Configure SOOP_CLIENT_SECRET on the relay server instead. Ignored. */
    clientSecret?: string;
}

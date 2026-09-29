export interface InitOptions{}

export interface ChzzkInitOptions extends InitOptions{
    redirectUri: string;
    apiBaseUrl?: string;
}

export interface SoopInitOptions extends InitOptions{
    clientId: string;
    clientSecret: string;
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
}

export interface SoopAuthOptions extends AuthOptions {
    clientId: string;
    clientSecret: string;
}

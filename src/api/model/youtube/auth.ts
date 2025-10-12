export interface YouTubeAuthCodeRequest {
    clientId: string;
    redirectUri: string;
    state?: string;
    scope?: string;
}
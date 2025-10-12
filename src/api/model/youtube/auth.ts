// YouTube OAuth 2.0 인증 관련 타입

export interface YouTubeAuthCodeRequest {
    clientId: string;
    redirectUri: string;
    state?: string;
    scope?: string;
}

export interface YouTubeTokenRequest {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    grantType: 'authorization_code';
}

export interface YouTubeTokenRefreshRequest {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
    grantType: 'refresh_token';
}

export interface YouTubeTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
}

export interface YouTubeErrorResponse {
    error: {
        code: number;
        message: string;
        errors?: Array<{
            domain: string;
            reason: string;
            message: string;
        }>;
    };
}

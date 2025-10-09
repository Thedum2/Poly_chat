export interface GetAuthRequest {
    authCode: string;
}

export interface GetAuthResponse {
    access_token: string;
    refresh_token: string;
}

export interface RefreshAuthRequest {
    refreshToken: string;
}

export interface RefreshAuthResponse {
    access_token: string;
    refresh_token: string;
}

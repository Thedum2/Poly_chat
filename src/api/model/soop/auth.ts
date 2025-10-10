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

/**
 * SOOP OAuth URL 생성
 */
export function buildSoopAuthUrl(clientId: string): string {
    return `https://openapi.sooplive.co.kr/auth/code?client_id=${clientId}&response_type=code`;
}

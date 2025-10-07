import {ResponseBase} from "./common";

{/* 인증 코드 요청 및 발급 */}
export interface AuthCodeRequest {
    clientId: string;
    redirectUri: string;
    state: string;
}

export interface AuthCodeResponse{
    code: string;
    state: string;
}

{/*치지직 Access Token 발급 */}
export interface TokenIssueRequest {
    grantType: 'authorization_code';
    clientId: string;
    clientSecret: string;
    code: string;
    state: string;
}
export interface TokenIssueResponse extends ResponseBase{
    content: {
        accessToken: string;
        refreshToken: string;
        tokenType: 'Bearer';
        expiresIn: string;
        scope: string;
    };
}

{/* Access Token 갱신 */}
export interface TokenRefreshRequest {
    grantType: 'refresh_token';
    refreshToken: string;
    clientId: string;
    clientSecret: string;
}
export interface TokenRefreshResponse extends ResponseBase{
    content: {
        accessToken: string;
        refreshToken: string;
        tokenType: 'Bearer';
        expiresIn: string;
        scope: string;
    };
}

{/* 치지직 Access Token 삭제 */}
export interface TokenRevokeRequest {
    clientId: string;
    clientSecret: string;
    token: string;
    tokenTypeHint?: 'access_token' | 'refresh_token';
}
export interface TokenRevokeResponse extends ResponseBase{
    content: {
        accessToken: string;
        refreshToken: string;
        tokenType: 'Bearer';
        expiresIn: string;
        scope: string;
    };
}
import { platformApiUrl } from '../../relay';
import { httpClient } from "../../httpClient";
import {
    AuthCodeRequest,
    TokenIssueRequest,
    TokenIssueResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    TokenRevokeRequest,
    TokenRevokeResponse
} from "../../model/chzzk/auth";

const getChzzkApiUrl = (base?: string) => platformApiUrl('chzzk', '', base).replace(/\/$/, '');

export const chzzkAuthApi = {
    //======================
    // 1. 인증 코드 요청 및 발급
    //======================
    getAuthCodeUrl: (data : AuthCodeRequest): string => {
        const params = new URLSearchParams(data as any).toString();
        return `https://chzzk.naver.com/account-interlock?${params}`;
    },

    //======================
    // 2. 치지직 Access Token 발급
    //======================
    getAccessToken: async (data: TokenIssueRequest, apiBaseUrl?: string): Promise<TokenIssueResponse> => {
        return httpClient.post(
            `${getChzzkApiUrl(apiBaseUrl)}/auth/v1/token`,
            { grantType: 'authorization_code', clientId: data.clientId, code: data.code, state: data.state },
            (data) => data as TokenIssueResponse,
            { headers: { 'Content-Type': 'application/json' } }
        );
    },

    //======================
    // 3. 치지직 Access Token 갱신
    //======================
    refreshAccessToken: async (data: TokenRefreshRequest, apiBaseUrl?: string): Promise<TokenRefreshResponse> => {
        return httpClient.post(
            `${getChzzkApiUrl(apiBaseUrl)}/auth/v1/token`,
            { grantType: 'refresh_token', clientId: data.clientId, refreshToken: data.refreshToken },
            (data) => data as TokenRefreshResponse,
            { headers: { 'Content-Type': 'application/json' } }
        );
    },

    //======================
    // 4. 치지직 Access Token 삭제
    //======================
    revokeAccessToken: async (data: TokenRevokeRequest, apiBaseUrl?: string): Promise<TokenRevokeResponse> => {
        return httpClient.post(
            `${getChzzkApiUrl(apiBaseUrl)}/auth/v1/token/revoke`,
            { clientId: data.clientId, token: data.token, tokenTypeHint: data.tokenTypeHint },
            (data) => data as TokenRevokeResponse,
            { headers: { 'Content-Type': 'application/json' } }
        );
    },
};

import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import {
    AuthCodeRequest,
    AuthCodeResponse,
    TokenIssueRequest,
    TokenIssueResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    TokenRevokeRequest,
    TokenRevokeResponse
} from "../../model/chzzk/auth";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";

const chzzkApiUrl = API_ENDPOINTS.Chzzk;

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
    getAccessToken: async (data: TokenIssueRequest): Promise<TokenIssueResponse> => {
        return httpClient.post(`${chzzkApiUrl}/auth/v1/token`, data, (data) => data as TokenIssueResponse);
    },

    //======================
    // 3. 치지직 Access Token 갱신
    //======================
    refreshAccessToken: async (data: TokenRefreshRequest): Promise<TokenRefreshResponse> => {
        return httpClient.post(`${chzzkApiUrl}/auth/v1/token`, data, (data) => data as TokenRefreshResponse);
    },

    //======================
    // 4. 치지직 Access Token 삭제
    //======================
    revokeAccessToken: async (data: TokenRevokeRequest): Promise<TokenRevokeResponse> => {
        return httpClient.post(`${chzzkApiUrl}/auth/v1/token/revoke`, data, (data) => data as TokenRevokeResponse);
    }
};
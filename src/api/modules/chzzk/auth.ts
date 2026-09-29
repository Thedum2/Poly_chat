import { httpClient } from "../../httpClient";
import {
    AuthCodeRequest,
    TokenIssueRequest,
    TokenIssueResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    TokenRevokeRequest,
    TokenRevokeResponse, PublicConfigResponse
} from "../../model/chzzk/auth";
import { chzzkAuthStore } from "../../../store/chzzkAuthStore";

const getChzzkApiUrl = () => chzzkAuthStore.getState().apiBaseUrl;

export const chzzkAuthApi = {
    getConfig: async (): Promise<PublicConfigResponse> => httpClient.get(
        `${getChzzkApiUrl()}/config`, (data) => data as PublicConfigResponse),

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
        return httpClient.post(
            `${getChzzkApiUrl()}/auth/token`,
            data,
            (data) => data as TokenIssueResponse,
            { headers: { 'Content-Type': 'application/json' } }
        );
    },

    //======================
    // 3. 치지직 Access Token 갱신
    //======================
    refreshAccessToken: async (data: TokenRefreshRequest): Promise<TokenRefreshResponse> => {
        return httpClient.post(
            `${getChzzkApiUrl()}/auth/refresh`,
            data,
            (data) => data as TokenRefreshResponse,
            { headers: { 'Content-Type': 'application/json' } }
        );
    },

    //======================
    // 4. 치지직 Access Token 삭제
    //======================
    revokeAccessToken: async (data: TokenRevokeRequest): Promise<TokenRevokeResponse> => {
        return httpClient.post(
            `${getChzzkApiUrl()}/auth/revoke`,
            data,
            (data) => data as TokenRevokeResponse,
            { headers: { 'Content-Type': 'application/json' } }
        );
    },
};

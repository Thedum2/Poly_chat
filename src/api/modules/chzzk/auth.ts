import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import {
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
    getAuthCodeUrl: (clientId: string, redirectUri: string, state: string): string => {
        const params = new URLSearchParams({
            clientId,
            redirectUri,
            state,
        });
        return `https://chzzk.naver.com/account-interlock?${params.toString()}`;
    },

    //======================
    // 2. 치지직 Access Token 발급
    //======================
    getAccessToken: async (data: TokenIssueRequest): Promise<TokenIssueResponse> => {
        return httpClient.post(`${chzzkApiUrl}/auth/v1/token`, data, (data) => data as TokenIssueResponse);
    },

    //======================
    // 3. 세션 생성 (클라이언트)
    //======================
    createClientSession: async (): Promise<SessionCreateClientResponse> => {
        return httpClient.get(`${chzzkApiUrl}/open/v1/sessions/auth/client`, (data) => data as SessionCreateClientResponse);
    },

    //======================
    // 4. 이벤트 구독 (채팅)
    //======================
    subscribeToChat: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/chat`, data, (data) => data);
    },

    //======================
    // 5. 이벤트 구독 (후원)
    //======================
    subscribeToDonation: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/donation`, data, (data) => data);
    },

    //======================
    // 6. 이벤트 구독 (구독)
    //======================
    subscribeToSubscription: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/subscription`, data, (data) => data);
    },

    //======================
    // 7. 치지직 Access Token 갱신
    //======================
    refreshAccessToken: async (data: TokenRefreshRequest): Promise<TokenRefreshResponse> => {
        return httpClient.post(`${chzzkApiUrl}/auth/v1/token`, data, (data) => data as TokenRefreshResponse);
    },

    //======================
    // 8. 치지직 Access Token 삭제
    //======================
    revokeAccessToken: async (data: TokenRevokeRequest): Promise<TokenRevokeResponse> => {
        return httpClient.post(`${chzzkApiUrl}/auth/v1/token/revoke`, data, (data) => data as TokenRevokeResponse);
    }
};
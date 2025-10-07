import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";

const chzzkApiUrl = API_ENDPOINTS.Chzzk;

export const chzzkSessionApi = {

    //======================
    // 1. 세션 생성 (클라이언트)
    //======================
    createClientSession: async (): Promise<SessionCreateClientResponse> => {
        return httpClient.get(`${chzzkApiUrl}/open/v1/sessions/auth/client`, (data) => data as SessionCreateClientResponse);
    },

    //======================
    // 2. 이벤트 구독 (채팅)
    //======================
    subscribeToChat: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/chat`, data, (data) => data);
    },

    //======================
    // 3. 이벤트 구독 (후원)
    //======================
    subscribeToDonation: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/donation`, data, (data) => data);
    },

    //======================
    // 4. 이벤트 구독 (구독)
    //======================
    subscribeToSubscription: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/subscription`, data, (data) => data);
    },

};
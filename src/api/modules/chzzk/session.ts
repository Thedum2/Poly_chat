import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const chzzkApiUrl = API_ENDPOINTS.Chzzk;

export const chzzkSessionApi = {

    //======================
    // 1. 세션 생성 (클라이언트)
    //======================
    createClientSession: async (): Promise<SessionCreateClientResponse> => {
        const { clientId, clientSecret } = chzzkAuthStore.getState();
        if (!clientId || !clientSecret) {
            throw new Error('Client ID and Client Secret are not set.');
        }

        const response = await httpClient.get(`${chzzkApiUrl}/open/v1/sessions/auth/client`, (data) => data as SessionCreateClientResponse, {
            headers: {
                'Client-Id': clientId,
                'Client-Secret': clientSecret,
            }
        });

        console.log('Chzzk session API response:', response);

        return response;
    },

    //======================
    // 2. 이벤트 구독 (채팅)
    //======================
    subscribeToChat: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/chat`, formData, (data) => data, { headers: { 'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}` } });
    },

    //======================
    // 3. 이벤트 구독 (후원)
    //======================
    subscribeToDonation: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/donation`, formData, (data) => data, { headers: { 'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}` } });
    },

    //======================
    // 4. 이벤트 구독 (구독)
    //======================
    subscribeToSubscription: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/subscription`, formData, (data) => data, { headers: { 'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}` } });
    },

};
import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const chzzkApiUrl = API_ENDPOINTS.Chzzk;

export const chzzkSessionApi = {
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

        return response;
    },

    subscribeToChat: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/chat`, formData, (data) => data, { headers: { 'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}` } });
    },

    subscribeToDonation: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/donation`, formData, (data) => data, { headers: { 'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}` } });
    },

    subscribeToSubscription: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${chzzkApiUrl}/open/v1/sessions/events/subscribe/subscription`, formData, (data) => data, { headers: { 'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}` } });
    },

};
import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const getChzzkApiUrl = () => chzzkAuthStore.getState().apiBaseUrl;

export const chzzkSessionApi = {
    createClientSession: async (): Promise<SessionCreateClientResponse> => {
        const { clientId, clientSecret } = chzzkAuthStore.getState();
        if (!clientId || !clientSecret) {
            throw new Error('Client ID and Client Secret are not set.');
        }

        const response = await httpClient.get(`${getChzzkApiUrl()}/open/v1/sessions/auth/client`, (data) => data as SessionCreateClientResponse, {
            headers: {
                'Client-Id': clientId,
                'Client-Secret': clientSecret,
                'Accept': 'application/json'
            }
        });

        return response;
    },

    subscribeToChat: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${getChzzkApiUrl()}/open/v1/sessions/events/subscribe/chat`, formData, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    subscribeToDonation: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${getChzzkApiUrl()}/open/v1/sessions/events/subscribe/donation`, formData, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    subscribeToSubscription: async (data: EventsSubscribeRequest): Promise<void> => {
        const formData = new FormData();
        formData.append('sessionKey', data.sessionKey);
        await httpClient.post(`${getChzzkApiUrl()}/open/v1/sessions/events/subscribe/subscription`, formData, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

};
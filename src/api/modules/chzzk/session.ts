import { platformApiUrl } from '../../relay';
import { httpClient } from "../../httpClient";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const getChzzkApiUrl = (base?: string) => platformApiUrl('chzzk', '', base).replace(/\/$/, '');

export const chzzkSessionApi = {
    createClientSession: async (apiBaseUrl?: string): Promise<SessionCreateClientResponse> => {
        const response = await httpClient.get(`${getChzzkApiUrl(apiBaseUrl)}/open/v1/sessions/auth`, (data) => data as SessionCreateClientResponse, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });

        return response;
    },

    subscribeToChat: async (data: EventsSubscribeRequest, apiBaseUrl?: string): Promise<void> => {
        await httpClient.post(`${getChzzkApiUrl(apiBaseUrl)}/open/v1/sessions/events/subscribe/chat?sessionKey=${encodeURIComponent(data.sessionKey)}`, undefined, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    subscribeToDonation: async (data: EventsSubscribeRequest, apiBaseUrl?: string): Promise<void> => {
        await httpClient.post(`${getChzzkApiUrl(apiBaseUrl)}/open/v1/sessions/events/subscribe/donation?sessionKey=${encodeURIComponent(data.sessionKey)}`, undefined, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    subscribeToSubscription: async (data: EventsSubscribeRequest, apiBaseUrl?: string): Promise<void> => {
        await httpClient.post(`${getChzzkApiUrl(apiBaseUrl)}/open/v1/sessions/events/subscribe/subscription?sessionKey=${encodeURIComponent(data.sessionKey)}`, undefined, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

};

import { httpClient } from "../../httpClient";
import { SessionCreateClientResponse, EventsSubscribeRequest } from "../../model/chzzk/session";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const getChzzkApiUrl = () => chzzkAuthStore.getState().apiBaseUrl;

export const chzzkSessionApi = {
    createClientSession: async (): Promise<SessionCreateClientResponse> => {
        const response = await httpClient.post(`${getChzzkApiUrl()}/sessions`, undefined, (data) => data as SessionCreateClientResponse, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });

        return response;
    },

    subscribeToChat: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${getChzzkApiUrl()}/sessions/events/subscribe/chat`, data, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    subscribeToDonation: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${getChzzkApiUrl()}/sessions/events/subscribe/donation`, data, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

    subscribeToSubscription: async (data: EventsSubscribeRequest): Promise<void> => {
        await httpClient.post(`${getChzzkApiUrl()}/sessions/events/subscribe/subscription`, data, (data) => data, {
            headers: {
                'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                'Accept': 'application/json'
            }
        });
    },

};

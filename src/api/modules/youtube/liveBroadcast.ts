import { httpClient } from "../../httpClient";
import {
    LiveBroadcastsListRequest,
    LiveBroadcastsListResponse,
} from "../../model/youtube/liveBroadcast";

import { platformApiUrl } from "../../relay";

export const youtubeLiveBroadcastApi = {

    //======================
    // 활성 방송 목록 가져오기
    //======================
    listLiveBroadcasts: async (
        accessToken: string,
        data: LiveBroadcastsListRequest,
        signal?: AbortSignal,
        apiBaseUrl?: string,
    ): Promise<LiveBroadcastsListResponse> => {
        const params = new URLSearchParams({ part: 'snippet' });
        if ('broadcastStatus' in data) params.set('broadcastStatus', data.broadcastStatus);
        else params.set('mine', String(data.mine));
        return httpClient.get(
            platformApiUrl('youtube', `/youtube/v3/liveBroadcasts?${params.toString()}`, apiBaseUrl),
            (data) => data as LiveBroadcastsListResponse,
            {
                signal,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
            }
        );
    },
};

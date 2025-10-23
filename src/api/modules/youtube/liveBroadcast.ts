import { httpClient } from "../../httpClient";
import {
    LiveBroadcastsListRequest,
    LiveBroadcastsListResponse,
} from "../../model/youtube/liveBroadcast";

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeLiveBroadcastApi = {

    //======================
    // 활성 방송 목록 가져오기
    //======================
    listLiveBroadcasts: async (
        accessToken: string,
        data: LiveBroadcastsListRequest
    ): Promise<LiveBroadcastsListResponse> => {
        const params = new URLSearchParams(data as any).toString();
        return httpClient.get(
            `${YOUTUBE_API_BASE_URL}/liveBroadcasts?${params.toString()}`,
            (data) => data as LiveBroadcastsListResponse,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
            }
        );
    },
};

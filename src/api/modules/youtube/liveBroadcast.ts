import { httpClient } from "../../httpClient";
import {
    LiveBroadcastsListRequest,
    LiveBroadcastsListResponse,
} from "../../model/youtube/liveBroadcast";

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeLiveBroadcastApi = {

    //======================
    // 1. 활성 방송 목록 가져오기
    //======================
    listLiveBroadcasts: async (
        accessToken: string,
        request: LiveBroadcastsListRequest
    ): Promise<LiveBroadcastsListResponse> => {
        const params = new URLSearchParams({
            part: request.part,
            ...(request.broadcastStatus && { broadcastStatus: request.broadcastStatus }),
            ...(request.broadcastType && { broadcastType: request.broadcastType }),
            ...(request.mine !== undefined && { mine: String(request.mine) }),
            ...(request.maxResults && { maxResults: String(request.maxResults) }),
        });

        return httpClient.get(
            `${YOUTUBE_API_BASE_URL}/liveBroadcasts?${params.toString()}`,
            (data) => data as LiveBroadcastsListResponse,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
    },
};

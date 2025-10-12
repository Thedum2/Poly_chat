import { httpClient } from "../../httpClient";
import {
    LiveChatMessagesListRequest,
    LiveChatMessagesListResponse,
} from "../../model/youtube/liveChat";

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeLiveChatApi = {

    //======================
    // 1. Live Chat 메시지 목록 가져오기
    //======================
    listLiveChatMessages: async (
        accessToken: string,
        request: LiveChatMessagesListRequest
    ): Promise<LiveChatMessagesListResponse> => {
        const params = new URLSearchParams({
            liveChatId: request.liveChatId,
            part: request.part,
            ...(request.maxResults && { maxResults: String(request.maxResults) }),
            ...(request.pageToken && { pageToken: request.pageToken }),
        });

        return httpClient.get(
            `${YOUTUBE_API_BASE_URL}/liveChat/messages?${params.toString()}`,
            (data) => data as LiveChatMessagesListResponse,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
    },
};

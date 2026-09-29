import { httpClient } from "../../httpClient";
import {
    LiveChatMessagesListRequest,
    LiveChatMessagesListResponse,
} from "../../model/youtube/liveChat";

import { platformApiUrl } from "../../relay";

export const youtubeLiveChatApi = {

    //======================
    // 메시지 목록 가져오기
    //======================
    listLiveChatMessages: async (
        accessToken: string,
        request: LiveChatMessagesListRequest,
        apiBaseUrl?: string,
    ): Promise<LiveChatMessagesListResponse> => {
        const params = new URLSearchParams({
            liveChatId: request.liveChatId,
            part: request.part,
            ...(request.maxResults && { maxResults: String(request.maxResults) }),
            ...(request.pageToken && { pageToken: request.pageToken }),
        });

        return httpClient.get(
            platformApiUrl('youtube', `/youtube/v3/liveChat/messages?${params.toString()}`, apiBaseUrl),
            (data) => data as LiveChatMessagesListResponse,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                },
            }
        );
    },
};

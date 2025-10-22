import { httpClient } from "../../httpClient";
import {
    LiveChatMessagesListRequest,
    LiveChatMessagesListResponse,
} from "../../model/youtube/liveChat";
import {GetChannelInfoResponse} from "../../model/youtube/channel";
import {youtubeAuthStore} from "../../../store/youtubeAuthStore";

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeChannelApi = {
    //======================
    // YouTube 채널 정보 가져오기
    //======================
    getChannelInfo: async (): Promise<GetChannelInfoResponse> => {
        return httpClient.get(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
            (data) => data as any,
            {
                headers: {
                    'Authorization': `Bearer ${youtubeAuthStore.getState().accessToken}`
                }
            }
        );
    }
};

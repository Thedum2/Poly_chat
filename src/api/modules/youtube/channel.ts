import { httpClient } from "../../httpClient";
import {GetChannelInfoResponse} from "../../model/youtube/channel";
import {youtubeAuthStore} from "../../../store/youtubeAuthStore";
import {platformApiUrl} from "../../relay";

export const youtubeChannelApi = {
    //======================
    // YouTube 채널 정보 가져오기
    //======================
    getChannelInfo: async (apiBaseUrl?: string): Promise<GetChannelInfoResponse> => {
        return httpClient.get(
            platformApiUrl('youtube', '/youtube/v3/channels?part=snippet&mine=true', apiBaseUrl),
            (data) => data as any,
            {
                headers: {
                    'Authorization': `Bearer ${youtubeAuthStore.getState().accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );
    }
};
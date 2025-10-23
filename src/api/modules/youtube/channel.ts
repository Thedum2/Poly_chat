import { httpClient } from "../../httpClient";
import {GetChannelInfoResponse} from "../../model/youtube/channel";
import {youtubeAuthStore} from "../../../store/youtubeAuthStore";
import {API_ENDPOINTS} from "../../config";

export const youtubeChannelApi = {
    //======================
    // YouTube 채널 정보 가져오기
    //======================
    getChannelInfo: async (): Promise<GetChannelInfoResponse> => {
        const youtubeApiUrl = API_ENDPOINTS.Youtube;
        return httpClient.get(
            `${youtubeApiUrl}/youtube/v3/channels?part=snippet&mine=true`,
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
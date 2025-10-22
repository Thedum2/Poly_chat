import { httpClient } from "../../httpClient";
import { API_ENDPOINTS } from "../../config";
import {GetChannelInfoResponse, GetUserInfoResponse} from "../../model/chzzk/channel";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const chzzkApiUrl = API_ENDPOINTS.Chzzk;

export const chzzkChannelApi = {

    //======================
    // 5. 치지직 사용자 정보 가져오기
    //======================
    getUserInfo: async (): Promise<GetUserInfoResponse> => {
        return httpClient.get(
            `${chzzkApiUrl}/open/v1/users/me`,
            (data) => data as any,
            {
                headers: {
                    'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`
                }
            }
        );
    },

    //======================
    // 6. 치지직 채널 정보 가져오기
    //======================
    getChannelInfo: async (channelIds: string): Promise<GetChannelInfoResponse> => {
        const { clientId, clientSecret } = chzzkAuthStore.getState();
        if (!clientId || !clientSecret) {
            throw new Error('Client ID and Client Secret are not set.');
        }

        return httpClient.get(
            `${chzzkApiUrl}/open/v1/channels?channelIds=${channelIds}`,
            (data) => data as any,
            {
                headers: {
                    'Client-Id': clientId,
                    'Client-Secret': clientSecret
                }
            }
        );
    }
};
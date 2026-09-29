import { httpClient } from "../../httpClient";
import {GetChannelInfoResponse, GetUserInfoResponse} from "../../model/chzzk/channel";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const getChzzkApiUrl = () => chzzkAuthStore.getState().apiBaseUrl;

export const chzzkChannelApi = {

    //======================
    // 치지직 사용자 정보 가져오기
    //======================
    getUserInfo: async (): Promise<GetUserInfoResponse> => {
        return httpClient.get(
            `${getChzzkApiUrl()}/users/me`,
            (data) => data as any,
            {
                headers: {
                    'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );
    },

    //======================
    // 6. 치지직 채널 정보 가져오기
    //======================
    getChannelInfo: async (channelIds: string): Promise<GetChannelInfoResponse> => {
        return httpClient.get(
            `${getChzzkApiUrl()}/channels?channelIds=${encodeURIComponent(channelIds)}`,
            (data) => data as any,
            {
                headers: {
                    'Authorization': `Bearer ${chzzkAuthStore.getState().accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );
    }
};

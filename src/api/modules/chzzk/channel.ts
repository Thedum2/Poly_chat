import { platformApiUrl } from '../../relay';
import { httpClient } from "../../httpClient";
import {GetChannelInfoResponse, GetLiveStatusResponse, GetUserInfoResponse} from "../../model/chzzk/channel";
import {chzzkAuthStore} from "../../../store/chzzkAuthStore";

const getChzzkApiUrl = (base?: string) => platformApiUrl('chzzk', '', base).replace(/\/$/, '');

export const chzzkChannelApi = {

    //======================
    // 치지직 사용자 정보 가져오기
    //======================
    getUserInfo: async (apiBaseUrl?: string): Promise<GetUserInfoResponse> => {
        return httpClient.get(
            `${getChzzkApiUrl(apiBaseUrl)}/open/v1/users/me`,
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
    getChannelInfo: async (channelIds: string, _credentials?: { clientId: string; clientSecret?: string }, apiBaseUrl?: string): Promise<GetChannelInfoResponse> => {
        return httpClient.get(
            `${getChzzkApiUrl(apiBaseUrl)}/open/v1/channels?channelIds=${encodeURIComponent(channelIds)}`,
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
    // 치지직 방송 상태 (비공식 API, 중계 서버 경유)
    //======================
    getLiveStatus: async (channelId: string, apiBaseUrl?: string): Promise<GetLiveStatusResponse> => {
        return httpClient.get(
            `${getChzzkApiUrl(apiBaseUrl)}/live-status?channelId=${encodeURIComponent(channelId)}`,
            (data) => data as any,
            { headers: { 'Accept': 'application/json' } }
        );
    }
};

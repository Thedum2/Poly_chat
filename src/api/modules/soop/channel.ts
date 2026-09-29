import {platformApiUrl} from "../../relay";
import {httpClient} from "../../httpClient";
import {soopAuthStore} from "../../../store/soopAuthStore";
import {GetStationInfoResponse} from "../../model/soop/channel";

export const soopAuthApi = {
    getStationInfo: async (apiBaseUrl?: string): Promise<GetStationInfoResponse> => {
        const formData = new URLSearchParams();
        formData.append('access_token', soopAuthStore.getState().accessToken??'');

        return httpClient.post(
            platformApiUrl('soop', '/user/stationinfo', apiBaseUrl),
            formData.toString(),
            (data) => data as any,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': '*/*'
                }
            }
        );
    }
};

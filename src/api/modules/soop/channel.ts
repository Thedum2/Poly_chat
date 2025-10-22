import {API_ENDPOINTS} from "../../config";
import {httpClient} from "../../httpClient";
import {soopAuthStore} from "../../../store/soopAuthStore";
import {GetStationInfoResponse} from "../../model/soop/channel";

export const soopAuthApi = {
    getStationInfo: async (): Promise<GetStationInfoResponse> => {
        const soopApiUrl = API_ENDPOINTS.Soop;
        const formData = new URLSearchParams();
        formData.append('access_token', soopAuthStore.getState().accessToken??'');

        return httpClient.post(
            `${soopApiUrl}/user/stationinfo`,
            formData.toString(),
            (data) => data as any,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
    }
};

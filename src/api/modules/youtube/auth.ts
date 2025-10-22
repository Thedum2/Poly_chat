import { YouTubeAuthCodeRequest } from "../../model/youtube/auth";
import { youTubeScope } from "../../config";
import { httpClient } from "../../httpClient";

export const youtubeAuthApi = {

    getAuthCodeUrl: (data: YouTubeAuthCodeRequest): string => {
        const params = new URLSearchParams({
            client_id: data.clientId,
            redirect_uri: data.redirectUri,
            response_type: 'token',
            scope: data.scope || youTubeScope(),
            prompt: 'consent',
            state: data.state || ''
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },
};

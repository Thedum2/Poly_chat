import { httpClient } from '../../httpClient';
import { platformApiUrl } from '../../relay';
import type { GetAuthResponse, RefreshAuthResponse } from '../../model/soop/auth';

export function buildSoopAuthUrl(clientId: string): string {
    return `https://openapi.sooplive.co.kr/auth/code?${new URLSearchParams({ client_id: clientId, response_type: 'code' })}`;
}

export const soopTokenApi = {
    getAccessToken(code: string, apiBaseUrl?: string): Promise<GetAuthResponse> {
        return httpClient.post(
            platformApiUrl('soop', '/auth/token', apiBaseUrl),
            new URLSearchParams({ grant_type: 'authorization_code', code }).toString(),
            (data) => data as GetAuthResponse,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );
    },
    refreshAccessToken(refreshToken: string, apiBaseUrl?: string): Promise<RefreshAuthResponse> {
        return httpClient.post(
            platformApiUrl('soop', '/auth/token', apiBaseUrl),
            new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
            (data) => data as RefreshAuthResponse,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );
    },
};

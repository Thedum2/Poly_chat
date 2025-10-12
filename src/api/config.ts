export const PLATFORM_NAME = {
    CHZZK : "chzzk",
    SOOP : "soop",
    YOUTUBE : "youtube",
}

const isBrowser = typeof window !== 'undefined';

export const youTubeScope = (): string => {
    return [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube'
    ].join(' ');
};
export const API_ENDPOINTS = {
    Chzzk : isBrowser ? "/api/chzzk" : "https://openapi.chzzk.naver.com",
    Soop : isBrowser ? "/api/soop" : "https://api.sooplive.co.kr",
    Youtube : "www.youtube.com",
}
export const API_TIMEOUT_MS = 15000;
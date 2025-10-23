export const PLATFORM_NAME = {
    CHZZK : "chzzk",
    SOOP : "soop",
    YOUTUBE : "youtube",
}

export const youTubeScope = (): string => {
    return [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube'
    ].join(' ');
};
export const API_ENDPOINTS = {
    Chzzk : "CHZZK_API_URL", //CHZZK은 프록시 사용(CORS),
    Soop : "https://openapi.sooplive.co.kr",
    Youtube : "https://www.googleapis.com",
}
export const API_TIMEOUT_MS = 15000;
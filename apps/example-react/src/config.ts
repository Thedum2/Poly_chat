const apiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') ||
  (import.meta.env.MODE === 'production'
    ? 'https://api.galashow.cloud'
    : 'https://api-dev.galashow.cloud');

export const RELAY_API_BASE_URL = import.meta.env.DEV ? '/api' : apiBaseUrl;
export const CHZZK_API_BASE_URL = `${RELAY_API_BASE_URL}/chzzk`;
export const SOOP_API_BASE_URL = `${RELAY_API_BASE_URL}/soop`;
export const YOUTUBE_API_BASE_URL = `${RELAY_API_BASE_URL}/youtube`;
export const YOUTUBE_STREAM_URL = import.meta.env.VITE_YOUTUBE_STREAM_URL?.trim() || `${YOUTUBE_API_BASE_URL}/chat/stream`;

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') ||
  (import.meta.env.MODE === 'production'
    ? 'https://api.galashow.cloud'
    : 'https://api-dev.galashow.cloud');

// Vite's proxy exists only while serving locally, never in static builds.
export const CHZZK_API_BASE_URL = import.meta.env.DEV
  ? '/api/chzzk'
  : `${apiBaseUrl}/chzzk`;

export const YOUTUBE_STREAM_URL = import.meta.env.VITE_YOUTUBE_STREAM_URL?.trim() ||
  (import.meta.env.DEV ? '/api/youtube/chat/stream' : `${apiBaseUrl}/youtube/chat/stream`);

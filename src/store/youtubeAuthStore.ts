import { createStore } from 'zustand/vanilla';

interface YouTubeAuthStore {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearTokens: () => void;
}

export const youtubeAuthStore = createStore<YouTubeAuthStore>((set) => ({
  accessToken: null,
  refreshToken: null,
  setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
  clearTokens: () => set({ accessToken: null, refreshToken: null }),
}));

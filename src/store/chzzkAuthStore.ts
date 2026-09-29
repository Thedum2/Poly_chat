import {createStore} from 'zustand/vanilla';

interface ChzzkAuthStore {
    accessToken: string | null;
    refreshToken: string | null;
    sessionKey: string | null;
    channelId: string | null;
    apiBaseUrl: string;
    setApiBaseUrl: (apiBaseUrl: string) => void;
    setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
    setSessionKey: (sessionKey: string) => void;
    setChannelId: (channelId: string) => void;
    clearTokens: () => void;
}

export const chzzkAuthStore = createStore<ChzzkAuthStore>((set) => ({
    accessToken: null,
    refreshToken: null,
    sessionKey: null,
    channelId: null,
    apiBaseUrl: '/chzzk',
    setApiBaseUrl: (apiBaseUrl) => set({apiBaseUrl}),
    setTokens: (tokens) => set({accessToken: tokens.accessToken, refreshToken: tokens.refreshToken}),
    setSessionKey: (sessionKey) => set({sessionKey}),
    setChannelId: (channelId) => set({channelId}),
    clearTokens: () => set({
        accessToken: null,
        refreshToken: null,
        sessionKey: null,
        channelId: null
    }),
}));

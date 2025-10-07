import {createStore} from 'zustand/vanilla';

interface ChzzkAuthStore {
    clientId: string | null;
    clientSecret: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    sessionKey: string | null;
    channelId: string | null;
    setAuthOptions: (options: { clientId: string; clientSecret: string }) => void;
    setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
    setSessionKey: (sessionKey: string) => void;
    setChannelId: (channelId: string) => void;
    clearTokens: () => void;
}

export const chzzkAuthStore = createStore<ChzzkAuthStore>((set) => ({
    clientId: null,
    clientSecret: null,
    accessToken: null,
    refreshToken: null,
    sessionKey: null,
    channelId: null,
    setAuthOptions: (options) => set({clientId: options.clientId, clientSecret: options.clientSecret}),
    setTokens: (tokens) => set({accessToken: tokens.accessToken, refreshToken: tokens.refreshToken}),
    setSessionKey: (sessionKey) => set({sessionKey}),
    setChannelId: (channelId) => set({channelId}),
    clearTokens: () => set({
        clientId: null,
        clientSecret: null,
        accessToken: null,
        refreshToken: null,
        sessionKey: null,
        channelId: null
    }),
}));

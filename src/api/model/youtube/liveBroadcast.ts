// YouTube Live Broadcast API 타입

export interface LiveBroadcastsListRequest {
    part: string; // 'snippet,contentDetails,status'
    broadcastStatus?: 'active' | 'all' | 'completed' | 'upcoming';
    broadcastType?: 'all' | 'event' | 'persistent';
    mine?: boolean;
    maxResults?: number;
}

export interface LiveBroadcast {
    kind: string;
    etag: string;
    id: string;
    snippet: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: {
            [key: string]: {
                url: string;
                width: number;
                height: number;
            };
        };
        scheduledStartTime?: string;
        actualStartTime?: string;
        isDefaultBroadcast: boolean;
        liveChatId?: string;
    };
    contentDetails?: {
        boundStreamId?: string;
        boundStreamLastUpdateTimeMs?: string;
        monitorStream?: {
            enableMonitorStream: boolean;
            broadcastStreamDelayMs?: number;
        };
        enableEmbed?: boolean;
        enableDvr?: boolean;
        enableContentEncryption?: boolean;
        startWithSlate?: boolean;
        recordFromStart?: boolean;
        enableClosedCaptions?: boolean;
        closedCaptionsType?: string;
        enableLowLatency?: boolean;
        latencyPreference?: string;
        projection?: string;
        enableAutoStart?: boolean;
        enableAutoStop?: boolean;
    };
    status?: {
        lifeCycleStatus: string;
        privacyStatus: string;
        recordingStatus: string;
        madeForKids?: boolean;
        selfDeclaredMadeForKids?: boolean;
    };
}

export interface LiveBroadcastsListResponse {
    kind: string;
    etag: string;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
    items: LiveBroadcast[];
}

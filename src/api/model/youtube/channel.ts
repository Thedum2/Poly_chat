export interface GetChannelInfoResponse {
    items: Array<{
        id: string;
        snippet: {
            title: string;
            description: string;
            thumbnails: {
                default: { url: string };
                medium: { url: string };
                high: { url: string };
            };
        };
    }>;
}
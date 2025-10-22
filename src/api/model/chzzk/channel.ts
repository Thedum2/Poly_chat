export interface GetUserInfoResponse {
    code: number;
    message: string | null;
    content: {
        channelId: string;
        channelName: string;
        nickname: string;
    };
}

export interface GetChannelInfoResponse {
    code: number;
    message: string | null;
    content: {
        data: Array<{
            channelId: string;
            channelName: string;
            channelImageUrl: string;
            followerCount: number;
            verifiedMark: boolean;
        }>;
    };
}
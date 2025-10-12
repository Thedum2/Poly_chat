// YouTube Live Chat Messages API 타입

export interface LiveChatMessagesListRequest {
    liveChatId: string;
    part: string; // 'snippet,authorDetails'
    maxResults?: number;
    pageToken?: string;
}

export interface LiveChatMessage {
    kind: string;
    etag: string;
    id: string;
    snippet: {
        type: 'textMessageEvent' | 'superChatEvent' | 'superStickerEvent' | 'fanFundingEvent' | 'newSponsorEvent' | 'memberMilestoneChatEvent' | 'membershipGiftingEvent' | 'giftMembershipReceivedEvent' | 'messageDeletedEvent' | 'messageRetractedEvent' | 'userBannedEvent' | 'sponsorOnlyModeStartedEvent' | 'sponsorOnlyModeEndedEvent';
        liveChatId: string;
        authorChannelId: string;
        publishedAt: string;
        hasDisplayContent: boolean;
        displayMessage?: string;
        textMessageDetails?: {
            messageText: string;
        };
        superChatDetails?: {
            amountMicros: string;
            currency: string;
            amountDisplayString: string;
            userComment: string;
            tier: number;
        };
        superStickerDetails?: {
            superStickerMetadata: {
                stickerId: string;
                altText: string;
                language: string;
            };
            amountMicros: string;
            currency: string;
            amountDisplayString: string;
            tier: number;
        };
        fanFundingEventDetails?: {
            amountMicros: string;
            currency: string;
            amountDisplayString: string;
            userComment?: string;
        };
        newSponsorDetails?: {
            isUpgrade: boolean;
            memberLevelName: string;
        };
        memberMilestoneChatDetails?: {
            memberLevelName: string;
            memberMonth: number;
            userComment: string;
        };
        membershipGiftingDetails?: {
            giftMembershipsCount: number;
            giftMembershipsLevelName: string;
        };
        giftMembershipReceivedDetails?: {
            memberLevelName: string;
            gifterChannelId: string;
            associatedMembershipGiftingMessageId: string;
        };
        messageDeletedDetails?: {
            deletedMessageId: string;
        };
        messageRetractedDetails?: {
            retractedMessageId: string;
        };
        userBannedDetails?: {
            bannedUserDetails: {
                channelId: string;
                channelUrl: string;
                displayName: string;
                profileImageUrl: string;
            };
            banType: 'permanent' | 'temporary';
            banDurationSeconds?: number;
        };
    };
    authorDetails?: {
        channelId: string;
        channelUrl: string;
        displayName: string;
        profileImageUrl: string;
        isVerified: boolean;
        isChatOwner: boolean;
        isChatSponsor: boolean;
        isChatModerator: boolean;
    };
}

export interface LiveChatMessagesListResponse {
    kind: string;
    etag: string;
    nextPageToken?: string;
    pollingIntervalMillis: number;
    offlineAt?: string;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
    items: LiveChatMessage[];
}

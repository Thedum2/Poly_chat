
export type UserRoleCode =
    | 'streamer'                    // 스트리머
    | 'common_user'                 // 일반 유저
    | 'streaming_channel_manager'   // 채널 관리자
    | 'streaming_chat_manager';     // 채팅 운영자


{/* ================================ */}
{/* =========SYSTEM MESSAGE========= */}
{/* ================================ */}

export interface ConnectedMessageBody {
    type: 'connected';
    data: ConnectedData;
}
export interface SubscribedMessageBody {
    type: 'subscribed';
    data: EventSubscriptionData;
}
export interface UnsubscribedMessageBody {
    type: 'unsubscribed';
    data: EventSubscriptionData;
}
export interface RevokedMessageBody {
    type: 'revoked';
    data: EventSubscriptionData;
}
export interface ConnectedData {
    sessionKey: string;
}
export interface EventSubscriptionData {
    eventType: SubscribeEventType;
    channelId: string;
}

export type SubscribeEventType = 'CHAT' | 'DONATION' | 'SUBSCRIPTION';

{/* ================================ */}
{/* =========CHAT MESSAGE========= */}
{/* ================================ */}

export interface ChatEventMessage {
    type: 'chat';
    channelId: string;
    senderChannelId: string;
    profile: {
        nickname: string;
        verifiedMark: boolean;
        badges: { imageUrl: string }[];
        userRoleCode: string;
    };
    content: string;
    emojis: { [key: string]: string };
    messageTime: number;
    eventSentAt: string;
}

{/* ================================ */}
{/* =========DONATION MESSAGE========= */}
{/* ================================ */}

export interface DonationEventMessage {
    donationType: DonationType;
    channelId: string;
    donatorChannelId: string;
    donatorNickname: string;
    payAmount: string;
    donationText: string;
    emojis: EmojisMap;
}
export type DonationType = 'CHAT' | 'VIDEO';
export interface EmojisMap {
    [emojiId: string]: string;
}

export interface Badge {
    [key: string]: any;
}

{/* ================================ */}
{/* =========SUBSCRIPTION MESSAGE========= */}
{/* ================================ */}

export interface SubscriptionEventMessage {
    channelId: string;
    subscriberChannelId: string;
    subscriberNickname: string;
    tierNo: SubscriptionTier;
    tierName: string;
    month: number;
}

export type SubscriptionTier = 1 | 2;
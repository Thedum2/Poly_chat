import {
    ChatEventMessage,
    ConnectedMessageBody,
    DonationEventMessage,
    RevokedMessageBody,
    SubscribedMessageBody,
    SubscriptionEventMessage,
    SYSTEM_MESSAGE_TYPE,
    UnsubscribedMessageBody
} from "../../api/model/chzzk/chzzkMessage";
import {ChatMessage} from "../../models/ChatMessage";

export const chzzkMessageHandler = {
    handleSystemMessage: (data: string): any => {
        try {
            console.log('📩 SYSTEM :', data);
            const parsedData = JSON.parse(data);
            switch (parsedData.type) {
                case SYSTEM_MESSAGE_TYPE.CONNECTED:
                    return parsedData as ConnectedMessageBody;
                case SYSTEM_MESSAGE_TYPE.SUBSCRIBED:
                    return parsedData as SubscribedMessageBody;
                case SYSTEM_MESSAGE_TYPE.UNSUBSCRIBED:
                    return parsedData as UnsubscribedMessageBody;
                case SYSTEM_MESSAGE_TYPE.REVOKED:
                    return parsedData as RevokedMessageBody;
                default:
                    return { type: SYSTEM_MESSAGE_TYPE.UNKNOWN, rawData: data };
            }
        } catch (error) {
            console.error('Error parsing system message:', error);
            return { type: 'unknown', rawData: data };
        }
    },
    handleChatMessage: (data: string): ChatEventMessage => {
        try {
            console.log('💬 CHAT', data);
            return JSON.parse(data) as ChatEventMessage;
        } catch (error) {
            console.error('Error parsing chat message:', error);
            throw error;
        }
    },
    handleDonationMessage: (data: string): DonationEventMessage => {
        try {
            console.log('💰 DONATION', data);
            return JSON.parse(data) as DonationEventMessage;
        } catch (error) {
            console.error('Error parsing donation message:', error);
            throw error;
        }
    },
    handleSubscriptionMessage: (data: string): SubscriptionEventMessage => {
        try {
            console.log('⭐ SUBSCRIPTION', data);
            return JSON.parse(data) as SubscriptionEventMessage;
        } catch (error) {
            console.error('Error parsing subscription message:', error);
            throw error;
        }
    },
};
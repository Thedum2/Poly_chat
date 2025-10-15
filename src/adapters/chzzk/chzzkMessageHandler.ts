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
import {createLogger} from '../../utils/logger';

const logger = createLogger('[CHZZK:MessageHandler]');

export const chzzkMessageHandler = {
    handleSystemMessage: (data: string): any => {
        try {
            logger.debug('SYSTEM message received', data);
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
            logger.error('Error parsing system message:', error);
            return { type: 'unknown', rawData: data };
        }
    },
    handleChatMessage: (data: string): ChatEventMessage => {
        try {
            logger.debug('CHAT message received', data);
            return JSON.parse(data) as ChatEventMessage;
        } catch (error) {
            logger.error('Error parsing chat message:', error);
            throw error;
        }
    },
    handleDonationMessage: (data: string): DonationEventMessage => {
        try {
            logger.debug('DONATION message received', data);
            return JSON.parse(data) as DonationEventMessage;
        } catch (error) {
            logger.error('Error parsing donation message:', error);
            throw error;
        }
    },
    handleSubscriptionMessage: (data: string): SubscriptionEventMessage => {
        try {
            logger.debug('SUBSCRIPTION message received', data);
            return JSON.parse(data) as SubscriptionEventMessage;
        } catch (error) {
            logger.error('Error parsing subscription message:', error);
            throw error;
        }
    },
};
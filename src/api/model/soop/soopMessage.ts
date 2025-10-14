export const SOOP_ACTION = {
    MESSAGE: 'MESSAGE',
    MANAGER_MESSAGE: 'MANAGER_MESSAGE',
} as const;

/**
 * 일반 채팅 메시지
 */
export interface Message {
    action: typeof SOOP_ACTION.MESSAGE;
    message: {
        userId: string;
        userNickname: string;
        message: string;
    };
}

/**
 * 매니저 채팅
 */
export interface ManagerMessage {
    action: typeof SOOP_ACTION.MANAGER_MESSAGE;
    message: {
        userId: string;
        userNickname: string;
        message: string;
    };
}

export type SoopAction = typeof SOOP_ACTION[keyof typeof SOOP_ACTION];

export type SoopMessage = Message | ManagerMessage;

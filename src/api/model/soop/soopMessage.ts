import { UserStatus } from './common';

export const SOOP_ACTION = {
    JOIN: 'JOIN',
    QUIT: 'QUIT',
    IN: 'IN',
    OUT: 'OUT',
    USERSTATUS_CHANGED: 'USERSTATUS_CHANGED',
    MESSAGE: 'MESSAGE',
    MANAGER_MESSAGE: 'MANAGER_MESSAGE',
    CHAT_MUTED: 'CHAT_MUTED',
    BANNED: 'BANNED',
    BAN_REVOKED: 'BAN_REVOKED',
    BANNED_USER_LIST: 'BANNED_USER_LIST',
    MANAGER_APPOINTMENT: 'MANAGER_APPOINTMENT',
    BALLOON_GIFTED: 'BALLOON_GIFTED',
    STICKER_GIFTED: 'STICKER_GIFTED',
    QUICKVIEW_GIFTED: 'QUICKVIEW_GIFTED',
    SUBSCRIBED: 'SUBSCRIBED',
    SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
    ADBALLOON_GIFTED: 'ADBALLOON_GIFTED',
    VIDEOBALLOON_GIFTED: 'VIDEOBALLOON_GIFTED',
    SUBSCRIPTION_GIFTED: 'SUBSCRIPTION_GIFTED',
    OGQ_EMOTICON_GIFTED: 'OGQ_EMOTICON_GIFTED',
    CHAT_FREEZE: 'CHAT_FREEZE',
    POLL: 'POLL',
    BJ_NOTICE: 'BJ_NOTICE',
    ITEM_DROPS: 'ITEM_DROPS',
    BREAK_TIME: 'BREAK_TIME',
    GEM_GIFTED: 'GEM_GIFTED',
    BATTLE_MISSION_GIFTED: 'BATTLE_MISSION_GIFTED',
    BATTLE_MISSION_FINISHED: 'BATTLE_MISSION_FINISHED',
    BATTLE_MISSION_SETTLED: 'BATTLE_MISSION_SETTLED',
    CHALLENGE_MISSION_GIFTED: 'CHALLENGE_MISSION_GIFTED',
    CHALLENGE_MISSION_FINISHED: 'CHALLENGE_MISSION_FINISHED',
    CHALLENGE_MISSION_SETTLED: 'CHALLENGE_MISSION_SETTLED',
    CHALLENGE_MISSION_SPONSORS: 'CHALLENGE_MISSION_SPONSORS',
    SLOW_MODE: 'SLOW_MODE',
} as const;

/**
 * 채팅 입장 (본인)
 */
export interface JoinMessage {
    action: typeof SOOP_ACTION.JOIN;
    message: {
        userId: string;
        userNickname: string;
        userStatus: UserStatus;
    };
}

/**
 * 채팅 퇴장 (본인)
 * 자발적 퇴장(연결 해제)에는 응답 패킷이 없습니다.
 * 퇴장 전에 본 패킷이 왔다는 것은 강제 퇴장당했다는 뜻입니다.
 */
export interface QuitMessage {
    action: typeof SOOP_ACTION.QUIT;
    message: {
        message: string;
    };
}

/**
 * 채팅 입장 (참여자)
 */
export interface InMessage {
    action: typeof SOOP_ACTION.IN;
    message: {
        userList: {
            userId: string;
            userNickname: string;
            userStatus: UserStatus;
        }[];
    };
}

/**
 * 채팅 퇴장 (참여자)
 */
export interface OutMessage {
    action: typeof SOOP_ACTION.OUT;
    message: {
        userList: {
            userId: string;
            userNickname: string;
            isKick: boolean;
            userStatus: UserStatus;
        }[];
    };
}

/**
 * 참여자 상태 변경
 */
export interface UserStatusChangedMessage {
    action: typeof SOOP_ACTION.USERSTATUS_CHANGED;
    message: {
        userList: {
            userId: string;
            userNickname: string;
            userStatus: UserStatus;
        }[];
    };
}

/**
 * 일반 메시지
 */
export interface Message {
    action: typeof SOOP_ACTION.MESSAGE;
    message: {
        userId: string;
        userNickname: string;
        message: string;
        color: string;
        userStatus: UserStatus;
        subscriptionMonths: number;
        accSubscriptionMonths: number;
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
        userStatus: UserStatus;
        isAdmin: boolean;
        subscriptionMonths: number;
    };
}

/**
 * 채팅 금지
 */
export interface ChatMutedMessage {
    action: typeof SOOP_ACTION.CHAT_MUTED;
    message: {
        userId: string;
        userNickname: string;
        count: number;
        muteSeconds: number;
        message: string;
    };
}

/**
 * 강제 퇴장
 */
export interface BannedMessage {
    action: typeof SOOP_ACTION.BANNED;
    message: {
        userId: string;
        userNickname: string;
    };
}

/**
 * 강제 퇴장 취소
 */
export interface BanRevokedMessage {
    action: typeof SOOP_ACTION.BAN_REVOKED;
    message: {
        userId: string;
        userNickname: string;
    };
}

/**
 * 강제 퇴장 유저 목록
 */
export interface BannedUserListMessage {
    action: typeof SOOP_ACTION.BANNED_USER_LIST ;
    message: {
        userList: {
            userId: string;
            userNickname: string;
            userStatus: UserStatus;
        }[];
    };
}

/**
 * 매니저 임명/해제
 */
export interface ManagerAppointmentMessage {
    action: typeof SOOP_ACTION.MANAGER_APPOINTMENT;
    message: {
        userId: string;
        userNickname: string;
        userStatus: UserStatus;
        isAssigned: boolean;
    };
}

/**
 * 별풍선 선물
 */
export interface BalloonGiftedMessage {
    action: typeof SOOP_ACTION.BALLOON_GIFTED;
    message: {
        bjId: string;
        userId: string;
        userNickname: string;
        count: number;
        fanNumber: number;
        imageUrl: string;
        becomesTopFan: boolean;
        relaysBroad: boolean;
        fromVod: boolean;
    };
}

/**
 * 스티커 선물
 */
export interface StickerGiftedMessage {
    action: typeof SOOP_ACTION.STICKER_GIFTED;
    message: {
        bjId: string;
        bjNickname: string;
        userId: string;
        userNickname: string;
        count: number;
        imageUrl: string;
        supporterNumber: number;
        relaysBroad: boolean;
    };
}

/**
 * 퀵뷰 선물
 */
export interface QuickviewGiftedMessage {
    action: typeof SOOP_ACTION.QUICKVIEW_GIFTED;
    message: {
        userId: string;
        userNickname: string;
        receiverId: string;
        receiverNickname: string;
        imageUrl: string;
        type: 'GIFT_30' | 'GIFT_90' | 'GIFT_365' | 'GIFT_PLUS_7' | 'GIFT_PLUS_30' | 'GIFT_PLUS_90' | 'GIFT_PLUS_365';
    };
}

/**
 * 구독
 */
export interface SubscribedMessage {
    action: typeof SOOP_ACTION.SUBSCRIBED;
    message: {
        bjId: string;
        userId: string;
        userNickname: string;
        imageUrl: string;
        fromVod: boolean;
        type: 'NORMAL' | 'MEMBERSHIP_1' | 'MEMBERSHIP_3' | 'MEMBERSHIP_6' | 'MEMBERSHIP_12' | 'GIFT_30' | 'GIFT_90' | 'GIFT_180';
        tier: number;
    };
}

/**
 * 연속 구독
 */
export interface SubscriptionRenewedMessage {
    action: typeof SOOP_ACTION.SUBSCRIPTION_RENEWED;
    message: {
        bjId: string;
        userId: string;
        userNickname: string;
        imageUrl: string;
        subscriptionMonths: number;
        accSubscriptionMonths: number;
        tier: number;
    };
}

/**
 * 애드벌룬 선물
 */
export interface AdballoonGiftedMessage {
    action: typeof SOOP_ACTION.ADBALLOON_GIFTED;
    message: {
        bjId: string;
        userId: string;
        userNickname: string;
        count: number;
        imageUrl: string;
        fanNumber: number;
        title: string;
        relaysBroad: boolean;
        fromVod: boolean;
        fromStation: boolean;
    };
}

/**
 * 비디오 별풍선
 */
export interface VideoBalloonGiftedMessage {
    action: typeof SOOP_ACTION.VIDEOBALLOON_GIFTED;
    message: {
        bjId: string;
        userId: string;
        userNickname: string;
        count: number;
        imageUrl: string;
        fanNumber: number;
        becomesTopFan: boolean;
        relaysBroad: boolean;
    };
}

/**
 * 구독권 선물
 */
export interface SubscriptionGiftedMessage {
    action: typeof SOOP_ACTION.SUBSCRIPTION_GIFTED;
    message: {
        userId: string;
        userNickname: string;
        receiverId: string;
        receiverNickname: string;
        bjId: string;
        bjNickname: string;
        type: 'GIFT_30' | 'GIFT_90' | 'GIFT_180';
    };
}

/**
 * OGQ 이모티콘 선물
 */
export interface OgqEmoticonGiftedMessage {
    action: typeof SOOP_ACTION.OGQ_EMOTICON_GIFTED;
    message: {
        userId: string;
        userNickname: string;
        receiverId: string;
        receiverNickname: string;
        imageUrl: string;
        itemName: string;
    };
}

/**
 * 채팅 얼리기/녹이기
 */
export interface ChatFreezeMessage {
    action: typeof SOOP_ACTION.CHAT_FREEZE;
    message: {
        shouldFreeze: boolean;
        targets: ('BJ' | 'FAN' | 'SUPPORTER' | 'TOPFAN' | 'FOLLOWER' | 'MANAGER')[];
        limitByBalloons: number;
        limitBySubscriptionMonths: number;
    };
}

/**
 * 투표 상태 변경
 */
export interface PollMessage {
    action: typeof SOOP_ACTION.POLL;
    message: {
        bjId: string;
        pollNo: number;
        showsPoll: boolean;
        type: 'STARTED' | 'STOPED' | 'FINISHED' | 'ANNOUNCED';
    };
}

/**
 * 스트리머 채팅 공지
 */
export interface BjNoticeMessage {
    action: typeof SOOP_ACTION.BJ_NOTICE;
    message: {
        message: string;
        showsNotice: boolean;
    };
}

/**
 * 아이템 드롭스
 */
export interface ItemDropsMessage {
    action: typeof SOOP_ACTION.ITEM_DROPS;
    message: {
        bjId: string;
        itemName: string;
    };
}

/**
 * 쉬는 시간 상태 알림
 */
export interface BreakTimeMessage {
    action: typeof SOOP_ACTION.BREAK_TIME;
    message: {
        state: 'STARTED' | 'STOPED';
    };
}

/**
 * 라이브 젬 경품 당첨
 */
export interface GemGiftedMessage {
    action: typeof SOOP_ACTION.GEM_GIFTED;
    message: {
        userId: string;
        userNickname: string;
        itemName: string;
    };
}

/**
 * 대결미션 후원(시작)
 */
export interface BattleMissionGiftedMessage {
    action: typeof SOOP_ACTION.BATTLE_MISSION_GIFTED;
    message: {
        userId: string;
        userNickname: string;
        count: number;
        imageUrl: string;
        fanNumber: number;
        relaysBroad: boolean;
    };
}

/**
 * 대결미션 종료
 */
export interface BattleMissionFinishedMessage {
    action: typeof SOOP_ACTION.BATTLE_MISSION_FINISHED;
    message: {
        isDraw: boolean;
        winner: string;
    };
}

/**
 * 대결미션 정산
 */
export interface BattleMissionSettledMessage {
    action: typeof SOOP_ACTION.BATTLE_MISSION_SETTLED;
    message: {
        count: number;
        imageUrl: string;
    };
}

/**
 * 도전미션 후원(시작)
 */
export interface ChallengeMissionGiftedMessage {
    action: typeof SOOP_ACTION.CHALLENGE_MISSION_GIFTED;
    message: {
        userId: string;
        userNickname: string;
        count: number;
        imageUrl: string;
        relaysBroad: boolean;
    };
}

/**
 * 도전미션 종료
 */
export interface ChallengeMissionFinishedMessage {
    action: typeof SOOP_ACTION.CHALLENGE_MISSION_FINISHED;
    message: {
        missionStatus: 'SUCCESS' | 'FAIL';
        title: string;
    };
}

/**
 * 도전미션 정산
 */
export interface ChallengeMissionSettledMessage {
    action: typeof SOOP_ACTION.CHALLENGE_MISSION_SETTLED;
    message: {
        count: number;
        imageUrl: string;
    };
}

/**
 * 도전미션 후원자 목록
 */
export interface ChallengeMissionSponsorsMessage {
    action: typeof SOOP_ACTION.CHALLENGE_MISSION_SPONSORS;
    message: {
        userId: string;
        userNickname: string;
        count: number;
        imageUrl: string;
        fanNumber: number;
        relaysBroad: boolean;
    };
}

/**
 * 저속모드
 */
export interface SlowModeMessage {
    action: typeof SOOP_ACTION.SLOW_MODE;
    message: {
        duration: number;
    };
}

export type SoopAction = typeof SOOP_ACTION[keyof typeof SOOP_ACTION];

export type SoopMessage =
    | JoinMessage
    | QuitMessage
    | InMessage
    | OutMessage
    | UserStatusChangedMessage
    | Message
    | ManagerMessage
    | ChatMutedMessage
    | BannedMessage
    | BanRevokedMessage
    | BannedUserListMessage
    | ManagerAppointmentMessage
    | BalloonGiftedMessage
    | StickerGiftedMessage
    | QuickviewGiftedMessage
    | SubscribedMessage
    | SubscriptionRenewedMessage
    | AdballoonGiftedMessage
    | VideoBalloonGiftedMessage
    | SubscriptionGiftedMessage
    | OgqEmoticonGiftedMessage
    | ChatFreezeMessage
    | PollMessage
    | BjNoticeMessage
    | ItemDropsMessage
    | BreakTimeMessage
    | GemGiftedMessage
    | BattleMissionGiftedMessage
    | BattleMissionFinishedMessage
    | BattleMissionSettledMessage
    | ChallengeMissionGiftedMessage
    | ChallengeMissionFinishedMessage
    | ChallengeMissionSettledMessage
    | ChallengeMissionSponsorsMessage
    | SlowModeMessage;

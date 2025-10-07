import {ResponseBase} from "./common";

{/* 세션 생성 */}
export interface SessionCreateClientResponse extends ResponseBase {
    content: {
        url: string;
    };
}

{/* 세션 목록 조회 */}
export interface SessionListClientRequest {
    size: number;
    page: string;
}

export interface SessionListClientResponse extends ResponseBase{
    content: {data: Session[]}
}

export interface Session {
    sessionKey: string;
    connectedDate: string;
    disconnectedDate: string;
    subscribedEvents: SubscribedEvent[];
}
export interface SubscribedEvent {
    eventType: EventType;
    channelId: string;
}
export type EventType = 'CHAT' | 'DONATION' | 'SUBSCRIPTION';

export interface EventsSubscribeRequest {
    sessionKey : string;
}
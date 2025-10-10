import { GetAuthRequest, GetAuthResponse, RefreshAuthRequest, RefreshAuthResponse } from './auth';
import {SoopAction, SoopMessage} from "./soopMessage";

export interface GetRoomInfoResponse {
    chatNumber: string;
    bjId: string;
}

export interface FreezeChatResponse {
    isSuccess: boolean;
    failMessage: string;
}

export interface BanUserRequest {
    userId: string;
    chatMessage?: string;
}

export interface UnbanUserRequest {
    userId: string;
}

export interface SendMessageRequest {
    message: string;
}

export interface SendManagerMessageRequest {
    message: string;
}

export interface SetSlowModeRequest {
    duration: 5 | 10 | 20 | 30 | 60;
}

export interface ISoopChatSDK {
    openAuth(): void;
    getAuth(request: string): Promise<GetAuthResponse>;
    refreshAuth(request: RefreshAuthRequest): Promise<RefreshAuthResponse>;
    setAuth(accessToken: string): void;
    connect(): Promise<void>;
    handleMessageReceived(callback: (action: SoopAction, message: SoopMessage) => void): void;
    handleChatClosed(callback: () => void): void;
    handleError(callback: (code: string, message: string) => void): void;
    getRoomInfo(): Promise<GetRoomInfoResponse>;
    freezeChat(): Promise<FreezeChatResponse>;
    unfreezeChat(): Promise<FreezeChatResponse>;
    requestBannedUserList(): Promise<void>;
    banUser(request: BanUserRequest): Promise<void>;
    unbanUser(request: UnbanUserRequest): Promise<void>;
    sendMessage(request: SendMessageRequest): Promise<void>;
    sendManagerMessage(request: SendManagerMessageRequest): Promise<void>;
    setSlowMode(request: SetSlowModeRequest): Promise<void>;
    unsetSlowMode(): Promise<void>;
    disconnect(): void;
}

export interface ISoopChatSDKConstructor {
    new (clientId: string, clientSecret: string): ISoopChatSDK;
}
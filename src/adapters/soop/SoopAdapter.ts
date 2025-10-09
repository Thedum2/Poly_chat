import { EventEmitter } from 'events';
import { IChatAdapter } from '../../ports/IChatAdapter';
import { SoopInitOptions, SoopAuthOptions } from '../../models/Auth';
import { ChatMessage } from '../../models/ChatMessage';
import { soopAuthStore } from '../../store/soopAuthStore';
import {ISoopChatSDK, ISoopChatSDKConstructor} from "../../api/model/soop/sdk";
import {SoopAction, SoopMessage} from "../../api/model/soop/soopMessage";

declare global {
    interface Window {
        ChatSDK?: ISoopChatSDKConstructor;
    }
}

export class SoopAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'soop';
    private _isAuthenticated = false;
    private _isConnected = false;
    private chatSDK: ISoopChatSDK | null = null;

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(options: SoopInitOptions): Promise<void> {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            // SSR/Node 환경에서는 skip
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://static.sooplive.co.kr/asset/app/chat-sdk/sooplive-chat-sdk.js';
            script.async = true;

            script.onload = () => {
                try {
                    console.log('[SOOP] Chat SDK script loaded.');
                    if (!window.ChatSDK) {
                        throw new Error('window.ChatSDK is undefined after script load.');
                    }
                    this.chatSDK = new window.ChatSDK(options.clientId, options.clientSecret);
                    this.chatSDK.openAuth();
                    console.log('[SOOP] ChatSDK instance created and OAuth flow initiated.');
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            script.onerror = (err) => {
                console.error('[SOOP] Failed to load Chat SDK script.', err);
                reject(new Error('Failed to load Soop Chat SDK'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * authCode로 토큰 발급 (init()이 먼저 호출되어 있어야 함)
     */
    async authenticate(options: SoopAuthOptions): Promise<void> {
        try {
            if (!this.chatSDK) {
                throw new Error('ChatSDK not initialized. Call init() first.');
            }

            const tokens = await this.chatSDK.getAuth({ authCode: options.code });
            soopAuthStore.getState().setTokens({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
            });

            this._isAuthenticated = true;
            this.emit('auth', true);
            console.log('[SOOP] Authenticated with auth code.');
        } catch (error: any) {
            console.error('[SOOP] Authentication failed:', error);
            this._isAuthenticated = false;
            this.emit('auth', false);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * 연결 + 이벤트 바인딩
     */
    async connect(): Promise<void> {
        try {
            const { accessToken } = soopAuthStore.getState();
            if (!accessToken) {
                throw new Error('No access token available for Soop connection.');
            }
            if (!this.chatSDK) {
                throw new Error('Soop ChatSDK not initialized. Call init()/authenticate() first.');
            }

            this.chatSDK.setAuth(accessToken);
            await this.chatSDK.connect();
            this._isConnected = true;
            this.emit('connected');
            console.log('[SOOP] connected.');

            this.chatSDK.handleMessageReceived((action: SoopAction, message: SoopMessage) => {
                const parsed = this.parseSoopEvent(action, message);
                if (parsed) {
                    this.emit('message', parsed);
                } else {
                    this.emit('system', { action, payload: message });
                }
            });

            // 채팅 종료
            this.chatSDK.handleChatClosed(() => {
                this._isConnected = false;
                this.emit('disconnected');
                console.log('[SOOP] disconnected: chat closed.');
            });

            // SDK 내부 에러
            this.chatSDK.handleError((code: string, message: string) => {
                const err = new Error(`Soop SDK Error: ${code} - ${message}`);
                console.error(err.message);
                this.emit('error', err);
            });
        } catch (error: any) {
            console.error('[SOOP] connection failed:', error);
            this._isConnected = false;
            this.emit('error', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.chatSDK) {
                this.chatSDK.disconnect();
            }
        } finally {
            this._isConnected = false;
            this.emit('disconnected');
            console.log('[SOOP] disconnected.');
        }
    }

    async logout(): Promise<void> {
        await this.disconnect();
        soopAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        this.emit('auth', false);
        console.log('[SOOP] logged out.');
    }

    // --------------------------------
    // 내부: Soop 이벤트 → ChatMessage 파싱
    // --------------------------------
    private parseSoopEvent(action: SoopAction, soopMsg: SoopMessage): ChatMessage | null {
        if (action === 'MESSAGE' && soopMsg.action === 'MESSAGE') {
            const msg = soopMsg.message;
            return {
                platform: this.platform,
                chat_id: msg.userId,
                nickname: msg.userNickname,
                content: msg.message,
                timestamp: new Date(),
            };
        }

        if (action === 'MANAGER_MESSAGE' && soopMsg.action === 'MANAGER_MESSAGE') {
            const msg = soopMsg.message;
            return {
                platform: this.platform,
                chat_id: msg.userId,
                nickname: msg.userNickname,
                content: msg.message,
                timestamp: new Date(),
            };
        }

        return null;
    }
}

import { EventEmitter } from 'events';
import { IChatAdapter } from '../../ports/IChatAdapter';
import { SoopInitOptions, SoopAuthOptions } from '../../models/Auth';
import { ChatMessage } from '../../models/ChatMessage';
import { soopAuthStore } from '../../store/soopAuthStore';
import {ISoopChatSDK, ISoopChatSDKConstructor} from "../../api/model/soop/sdk";
import {SoopAction, SoopMessage} from "../../api/model/soop/soopMessage";
import { buildSoopAuthUrl } from "../../api/model/soop/auth";

declare global {
    interface Window {
        SOOP?: ISoopChatSDKConstructor;
    }
}

export class SoopAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'soop';
    private _isAuthenticated = false;
    private _isConnected = false;
    private chatSDK: ISoopChatSDK | null = null;
    private clientId: string = '';
    private authPopup: Window | null = null;

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(options: SoopInitOptions): Promise<string> {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            // SSR/Node 환경에서는 skip
            throw new Error('SOOP adapter requires browser environment');
        }

        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://static.sooplive.co.kr/asset/app/chat-sdk/sooplive-chat-sdk.js';
            script.async = true;

            script.onload = () => {
                setTimeout(() => {
                    try {
                        this.initializeChatSDK(options);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 200);
            };

            script.onerror = (err) => {
                console.error('[SOOP] Failed to load Chat SDK script.', err);
                reject(new Error('Failed to load Soop Chat SDK'));
            };

            document.head.appendChild(script);
        });

        try {
            const code = await this.openAuthPopup();
            console.log('[SOOP] OAuth code received:', code);
            return code;
        } catch (error) {
            console.error('[SOOP] OAuth popup failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private initializeChatSDK(options: SoopInitOptions): void {
        console.log('[SOOP] Chat SDK script loaded.');

        if (!window.SOOP) {
            throw new Error('SOOP Chat SDK not found on window.SOOP');
        }

        const ChatSDKConstructor = this.findChatSDKConstructor();
        this.chatSDK = new ChatSDKConstructor(options.clientId, options.clientSecret);
        this.clientId = options.clientId;
        console.log('[SOOP] ChatSDK instance created.');
    }

    /**
     * OAuth 팝업을 열고 인증 코드를 받아옵니다 (private - init()에서 자동 호출)
     */
    private openAuthPopup(): Promise<string> {
        return new Promise((resolve, reject) => {
            const authUrl = buildSoopAuthUrl(this.clientId);

            // 팝업 열기
            this.authPopup = window.open(
                authUrl,
                'SOOP OAuth',
                'width=500,height=700,left=100,top=100'
            );

            if (!this.authPopup) {
                reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'));
                return;
            }

            // 팝업 URL 모니터링
            const checkPopup = setInterval(() => {
                try {
                    if (this.authPopup && this.authPopup.closed) {
                        clearInterval(checkPopup);
                        reject(new Error('사용자가 OAuth 팝업을 닫았습니다.'));
                        return;
                    }

                    // 팝업의 URL에서 code 추출 시도
                    if (this.authPopup && this.authPopup.location.href.includes('code=')) {
                        const url = new URL(this.authPopup.location.href);
                        const code = url.searchParams.get('code');

                        if (code) {
                            clearInterval(checkPopup);
                            this.authPopup.close();
                            console.log('[SOOP] OAuth code received from popup:', code);
                            resolve(code);
                        }
                    }
                } catch (e) {
                }
            }, 500);

            // 5분 타임아웃
            setTimeout(() => {
                clearInterval(checkPopup);
                if (this.authPopup && !this.authPopup.closed) {
                    this.authPopup.close();
                }
                reject(new Error('OAuth 인증 시간이 초과되었습니다.'));
            }, 5 * 60 * 1000);
        });
    }

    private findChatSDKConstructor(): ISoopChatSDKConstructor {
        console.log('[SOOP] SOOP is an object. Keys:', Object.keys(window.SOOP!));

        const possibleConstructors = [
            (window.SOOP as any).ChatSDK,
            (window.SOOP as any).default,
            (window.SOOP as any).SDK,
            (window.SOOP as any).Chat,
        ];

        for (const constructor of possibleConstructors) {
            if (typeof constructor === 'function') {
                console.log('[SOOP] Found constructor:', constructor.name || 'anonymous');
                return constructor;
            }
        }

        throw new Error(`SOOP ChatSDK constructor not found. Keys: ${Object.keys(window.SOOP!).join(', ')}`);
    }

    /**
     * authCode로 토큰 발급 및 setAuth까지 진행 (init()이 먼저 호출되어 있어야 함)
     */
    async authenticate(options: SoopAuthOptions): Promise<void> {
        try {
            if (!this.chatSDK) {
                throw new Error('ChatSDK not initialized. Call init() first.');
            }

            console.log('[SOOP] Authenticating with auth code:', options.code);
            const tokens = await this.chatSDK.getAuth(options.code);
            soopAuthStore.getState().setTokens({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
            });

            // 토큰 받은 후 바로 setAuth 호출
            this.chatSDK.setAuth(tokens.access_token);

            this._isAuthenticated = true;
            console.log('[SOOP] Authenticated and setAuth completed.');
        } catch (error: any) {
            console.error('[SOOP] Authentication failed:', error);
            this._isAuthenticated = false;
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * 연결 + 이벤트 바인딩
     */
    async connect(): Promise<void> {
        try {
            if (!this._isAuthenticated) {
                throw new Error('Not authenticated. Call authenticate() first.');
            }
            if (!this.chatSDK) {
                throw new Error('Soop ChatSDK not initialized. Call init()/authenticate() first.');
            }

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

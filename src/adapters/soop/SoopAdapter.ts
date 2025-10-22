import { EventEmitter } from 'events';
import { IChatAdapter } from '../../ports/IChatAdapter';
import { SoopInitOptions, SoopAuthOptions } from '../../models/Auth';
import { ChatMessage } from '../../models/ChatMessage';
import { soopAuthStore } from '../../store/soopAuthStore';
import {ISoopChatSDK, ISoopChatSDKConstructor} from "../../api/model/soop/sdk";
import {SOOP_ACTION, SoopAction, SoopMessage} from "../../api/model/soop/soopMessage";
import {createLogger} from '../../utils/logger';
import {buildSoopAuthUrl} from "../../api/modules/soop/auth";
import {soopAuthApi} from "../../api/modules/soop/channel";

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
    private code: string = '';
    private authPopup: Window | null = null;
    private logger = createLogger('[SOOP]');

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(options: SoopInitOptions): Promise<void> {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
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
                this.logger.error('Failed to load Chat SDK script:', err);
                reject(new Error('Failed to load Soop Chat SDK'));
            };

            document.head.appendChild(script);
        });

        try {
            this.code = await this.openAuthPopup();
            this.logger.info('OAuth code received');
            this.emit('initialized');
        } catch (error) {
            this.logger.error('OAuth popup failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private initializeChatSDK(options: SoopInitOptions): void {
        this.logger.debug('Chat SDK script loaded');

        if (!window.SOOP) {
            throw new Error('SOOP Chat SDK not found on window.SOOP');
        }

        const ChatSDKConstructor = this.findChatSDKConstructor();
        this.chatSDK = new ChatSDKConstructor(options.clientId, options.clientSecret);
        this.clientId = options.clientId;
        this.logger.debug('ChatSDK instance created');
    }

    private openAuthPopup(): Promise<string> {
        return new Promise((resolve, reject) => {
            const authUrl = buildSoopAuthUrl(this.clientId);

            this.authPopup = window.open(
                authUrl,
                'SOOP OAuth',
                'width=500,height=700,left=100,top=100'
            );

            if (!this.authPopup) {
                reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'));
                return;
            }

            let isResolved = false;

            const checkPopupUrl = setInterval(() => {
                if (this.authPopup && this.authPopup.closed) {
                    if (!isResolved) {
                        cleanup();
                        reject(new Error('사용자가 OAuth 팝업을 닫았습니다.'));
                    }
                    return;
                }

                try {
                    const popupUrl = this.authPopup?.location.href;
                    if (popupUrl) {
                        const url = new URL(popupUrl);
                        const code = url.searchParams.get('code');

                        if (code) {
                            isResolved = true;
                            cleanup();
                            if (this.authPopup && !this.authPopup.closed) {
                                this.authPopup.close();
                            }
                            resolve(code);
                        }
                    }
                } catch (error) {

                }
            }, 500);

            const timeout = setTimeout(() => {
                if (!isResolved) {
                    cleanup();
                    if (this.authPopup && !this.authPopup.closed) {
                        this.authPopup.close();
                    }
                    reject(new Error('OAuth 인증 시간이 초과되었습니다.'));
                }
            }, 5 * 60 * 1000);

            const cleanup = () => {
                clearInterval(checkPopupUrl);
                clearTimeout(timeout);
            };
        });
    }

    private findChatSDKConstructor(): ISoopChatSDKConstructor {
        this.logger.debug('SOOP window keys:', Object.keys(window.SOOP!));

        const possibleConstructors = [
            (window.SOOP as any).ChatSDK,
            (window.SOOP as any).default,
            (window.SOOP as any).SDK,
            (window.SOOP as any).Chat,
        ];

        for (const constructor of possibleConstructors) {
            if (typeof constructor === 'function') {
                this.logger.debug('Found constructor:', constructor.name || 'anonymous');
                return constructor;
            }
        }

        throw new Error(`SOOP ChatSDK constructor not found. Keys: ${Object.keys(window.SOOP!).join(', ')}`);
    }

    async authenticate(options: SoopAuthOptions): Promise<void> {
        try {
            if (!this.chatSDK) {
                throw new Error('ChatSDK not initialized. Call init() first.');
            }
            const tokens = await this.chatSDK.getAuth(this.code);
            soopAuthStore.getState().setTokens({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
            });

            this.chatSDK.setAuth(tokens.access_token);

            try {
                const stationInfo = await soopAuthApi.getStationInfo();

                if (stationInfo.result === 1 && stationInfo.data) {
                    this._isAuthenticated = true;
                    this.emit('auth', {
                        nickname: stationInfo.data.station_name,
                        profileImageUrl: stationInfo.data.profile_image
                    });
                    this.logger.info('Authenticated successfully with broadcaster info');
                } else {
                    this._isAuthenticated = true;
                    this.emit('auth', null);
                    this.logger.info('Authenticated successfully but no broadcaster info found');
                }
            } catch (error: any) {
                this.logger.warn('Failed to get broadcaster info:', error);
                this._isAuthenticated = true;
                this.emit('auth', null);
                this.logger.info('Authenticated successfully but failed to fetch broadcaster info');
            }
        } catch (error: any) {
            this.logger.error('Authentication failed:', error);
            this._isAuthenticated = false;
            this.emit('auth', null);
            this.emit('error', error);
            throw error;
        }
    }

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
            this.logger.info('Connected');

            this.chatSDK.handleMessageReceived((action: SoopAction, message: SoopMessage) => {
                this.logger.debug('Message received:', action, message);

                const parsed = this.parseSoopEvent(action, message);
                if (parsed) {
                    this.emit('message', parsed);
                }
            });

            this.chatSDK.handleChatClosed(() => {
                this._isConnected = false;
                this.emit('disconnected');
                this.logger.info('Chat closed');
            });

            this.chatSDK.handleError((code: string, message: string) => {
                const err = new Error(`SDK Error: ${code} - ${message}`);
                this.logger.error(err.message);
                this.emit('error', err);
            });
        } catch (error: any) {
            this.logger.error('Connection failed:', error);
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
            this.logger.info('Disconnected');
        }
    }

    async logout(): Promise<void> {
        await this.disconnect();
        soopAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        this.emit('auth', null);
        this.logger.info('Logged out');
    }

    private parseSoopEvent(action: SoopAction, soopMsg: any): ChatMessage | null {
        if (action === SOOP_ACTION.MESSAGE) {
            return {
                platform: this.platform,
                chat_id: 'unknown', // TODO 1.1.0: Implement unique chat message ID tracking
                nickname: soopMsg.userNickname || 'Unknown',
                content: soopMsg.message || '',
                timestamp: new Date(),
            };
        }

        if (action === SOOP_ACTION.MANAGER_MESSAGE) {
            return {
                platform: this.platform,
                chat_id: 'unknown', // TODO 1.1.0: Implement unique chat message ID tracking
                nickname: soopMsg.userNickname || 'Unknown',
                content: soopMsg.message || '',
                timestamp: new Date(),
            };
        }

        return null;
    }
}

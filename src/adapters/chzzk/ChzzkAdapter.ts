import {EventEmitter} from 'events';
import {platformApiUrl} from '../../api/relay';
import {IChatAdapter} from '../../ports/IChatAdapter';
import {ChzzkAuthOptions, ChzzkInitOptions} from '../../models/Auth';
import {chzzkAuthApi} from '../../api/modules/chzzk/auth';
import {chzzkAuthStore} from '../../store/chzzkAuthStore';
import {chzzkSessionApi} from '../../api/modules/chzzk/session';
import {SocketClientOptions} from '../../sio/socket';
import {destroySocket, getSocket} from '../../sio/singleton';
import {chzzkMessageHandler} from './chzzkMessageHandler';
import {ConnectedMessageBody, SYSTEM_MESSAGE_TYPE} from '../../api/model/chzzk/chzzkMessage';
import {PLATFORM_NAME} from '../../api/config';
import {ChatMessage} from '../../models/ChatMessage';
import {v4 as uuidv4} from 'uuid';
import {createLogger} from '../../utils/logger';
import {chzzkChannelApi} from "../../api/modules/chzzk/channel";

function safeChzzkError(error: unknown): string {
    const status = (error as { response?: { status?: unknown } })?.response?.status;
    return typeof status === 'number' ? `HTTP ${status}` : 'Request failed';
}

export class ChzzkAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'chzzk';
    private _isAuthenticated = false;
    private _isConnected = false;
    private code: string = '';
    private clientId: string = '';
    private apiBaseUrl = '/api/chzzk';
    private authPopup: Window | null = null;
    private state: string = '';
    private logger = createLogger('[CHZZK]');

    private opts: SocketClientOptions = {
        url: '',
        transports: ['websocket'],
        forceNew: true,
        debug: true,
        timeout: 3000,
    };

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(options: ChzzkInitOptions): Promise<void> {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('Chzzk adapter requires browser environment');
        }

        const callback = new URL(options.redirectUri, window.location.origin);
        if (callback.origin !== window.location.origin || !callback.pathname) {
            throw new Error('CHZZK callback origin must match the current page origin');
        }

        this._isAuthenticated = false;
        this._isConnected = false;
        try {
            destroySocket();
        } catch {
        }

        if (!options.clientId.trim()) throw new Error('CHZZK clientId is required');
        this.apiBaseUrl = platformApiUrl('chzzk', '', options.apiBaseUrl).replace(/\/$/, '');
        this.clientId = options.clientId;
        this.code = '';
        this.state = '';
        chzzkAuthStore.getState().clearTokens();

        // Open in the click handler so the browser permits the OAuth popup.
        this.authPopup = window.open('about:blank', 'Chzzk OAuth', 'width=500,height=700,left=100,top=100');
        if (!this.authPopup) throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');

        try {
            this.state = uuidv4();
            this.authPopup.location.href = chzzkAuthApi.getAuthCodeUrl({
                clientId: this.clientId,
                redirectUri: callback.href,
                state: this.state,
            });
            this.code = await this.waitForAuthCallback(callback);
            this.logger.info('OAuth code received');
            this.emit('initialized');
            return;
        } catch (error) {
            this.code = '';
            this.state = '';
            if (this.authPopup && !this.authPopup.closed) this.authPopup.close();
            this.authPopup = null;
            this.logger.error('OAuth popup failed:', safeChzzkError(error));
            this.emit('error', error);
            throw error;
        }
    }

    private waitForAuthCallback(callback: URL): Promise<string> {
        return new Promise((resolve, reject) => {
            const checkPopupUrl = setInterval(() => {
                if (this.authPopup && this.authPopup.closed) {
                    cleanup();
                    reject(new Error('사용자가 OAuth 팝업을 닫았습니다.'));
                    return;
                }

                try {
                    const popupUrl = this.authPopup?.location.href;
                    if (popupUrl) {
                        const url = new URL(popupUrl);
                        if (url.origin !== callback.origin || url.pathname !== callback.pathname) return;
                        const error = url.searchParams.get('error');
                        const code = url.searchParams.get('code');
                        if ((error || code) && url.searchParams.get('state') !== this.state) {
                            cleanup();
                            reject(new Error('CHZZK OAuth state mismatch'));
                            return;
                        }
                        if (error) {
                            cleanup();
                            reject(new Error(`CHZZK OAuth error: ${error}`));
                            return;
                        }
                        if (code) {
                            cleanup();
                            if (this.authPopup && !this.authPopup.closed) {
                                this.authPopup.close();
                            }
                            this.authPopup = null;
                            resolve(code);
                        }
                    }
                } catch (error) {
                }
            }, 500);
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('OAuth 인증 시간이 초과되었습니다.'));
            }, 5 * 60 * 1000);

            const cleanup = () => {
                clearInterval(checkPopupUrl);
                clearTimeout(timeout);
            };
        });
    }

    async authenticate(options: ChzzkAuthOptions): Promise<void> {
        try {
            if (!this.clientId || !this.code || !this.state) {
                throw new Error('A validated CHZZK OAuth callback is required');
            }

            const tokens = await chzzkAuthApi.getAccessToken({
                clientId: this.clientId,
                code: this.code,
                state: this.state,
            }, this.apiBaseUrl);
            this.code = '';
            this.state = '';

            chzzkAuthStore.getState().setTokens({
                accessToken: tokens.content.accessToken,
                refreshToken: tokens.content.refreshToken,
            });

            try {
                const userInfo = await chzzkChannelApi.getUserInfo(this.apiBaseUrl);
                const channelInfo = await chzzkChannelApi.getChannelInfo(userInfo.content.channelId, undefined, this.apiBaseUrl);

                if (channelInfo.content.data.length > 0) {
                    const channel = channelInfo.content.data[0];
                    this._isAuthenticated = true;
                    this.emit('auth', {
                        nickname: channel.channelName,
                        profileImageUrl: channel.channelImageUrl
                    });
                    this.logger.info('Authenticated successfully with broadcaster info');
                } else {
                    this._isAuthenticated = true;
                    this.emit('auth', null);
                    this.logger.info('Authenticated successfully but no broadcaster info found');
                }
            } catch (error: any) {
                this.logger.warn('Failed to get broadcaster info:', safeChzzkError(error));
                this._isAuthenticated = true;
                this.emit('auth', null);
                this.logger.info('Authenticated successfully but failed to fetch broadcaster info');
            }
        } catch (error: any) {
            this.logger.error('Authentication failed:', safeChzzkError(error));
            this._isAuthenticated = false;
            this.emit('auth', null);
            this.emit('error', error);
            throw error;
        }
    }

    async connect(): Promise<void> {
        if (!this._isAuthenticated) {
            throw new Error('Authentication is required before connecting.');
        }

        this._isConnected = false;

        try {
            const sessionResponse = await chzzkSessionApi.createClientSession(this.apiBaseUrl);
            this.opts.url = sessionResponse.content.url;

            const socket = getSocket(this.opts);
            socket.connect();

            socket.on('SYSTEM', async (raw: string) => {
                const result = chzzkMessageHandler.handleSystemMessage(raw);

                switch (result.type) {
                    case SYSTEM_MESSAGE_TYPE.CONNECTED: {
                        const connected = result as ConnectedMessageBody;
                        chzzkAuthStore.getState().setSessionKey(connected.data.sessionKey);

                        try {
                            await this.subscribeAll();
                            this._isConnected = true;
                            this.emit('connected');
                            this.logger.debug('Connected and subscribed');
                        } catch (error) {
                            this._isConnected = false;
                            socket.disconnect();
                            this.emit('disconnected');
                            this.logger.error('Event subscription failed:', safeChzzkError(error));
                            this.emit('error', error);
                        }
                        break;
                    }
                    case SYSTEM_MESSAGE_TYPE.SUBSCRIBED:
                        this.logger.debug('Subscribed');
                        break;
                    case SYSTEM_MESSAGE_TYPE.UNSUBSCRIBED:
                        this.logger.debug('Unsubscribed');
                        break;
                    case SYSTEM_MESSAGE_TYPE.REVOKED:
                        this.logger.warn('Token/session revoked');
                        this.emit('error', new Error('Session revoked'));
                        break;
                    case SYSTEM_MESSAGE_TYPE.UNKNOWN:
                    default:
                        this.logger.debug('System message: unknown');
                        break;
                }
            });

            socket.on('CHAT', (raw: string) => {
                const chatEvent = chzzkMessageHandler.handleChatMessage(raw);

                const msg: ChatMessage = {
                    platform: PLATFORM_NAME.CHZZK,
                    chat_id: 'unknown', // TODO 1.1.0: Implement unique chat message ID tracking
                    nickname: chatEvent.profile?.nickname ?? 'unknown',
                    content: chatEvent.content ?? '',
                    timestamp: new Date((chatEvent as any)?.timestamp ?? Date.now()),
                };

                this.emit('message', msg);
            });

            socket.on('DONATION', (raw: string) => {
                const donation = chzzkMessageHandler.handleDonationMessage(raw);
                this.logger.debug('Donation received:', donation);
                this.emit('donation', donation);
            });

            socket.on('SUBSCRIPTION', (raw: string) => {
                const sub = chzzkMessageHandler.handleSubscriptionMessage(raw);
                this.logger.debug('Subscription received:', sub);
                this.emit('subscription', sub);
            });
        } catch (error) {
            this.logger.error('Connection failed:', safeChzzkError(error));
            this.emit('error', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            destroySocket();
        } finally {
            this._isConnected = false;
            this.emit('disconnected');
            this.logger.info('Disconnected');
        }
    }

    async logout(): Promise<void> {
        await this.disconnect();
        chzzkAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        this.clientId = '';
        this.code = '';
        this.state = '';
        this.emit('auth', null);
        this.logger.info('Logged out');
    }


    private async subscribeAll(): Promise<void> {
        await this.subscribeToChat();
        // Extra event scopes are optional for a chat connection.
        for (const { name, subscribe } of [
            { name: '후원', subscribe: () => this.subscribeToDonation() },
            { name: '구독', subscribe: () => this.subscribeToSubscription() },
        ]) {
            try {
                await subscribe();
            } catch (error: any) {
                if (error?.response?.status !== 403) throw error;
                this.logger.warn(`${name} 이벤트 구독이 거부되어 건너뜁니다. (HTTP 403)`);
            }
        }
    }
    private async subscribeToChat(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        if (!sessionKey) return;

        await chzzkSessionApi.subscribeToChat({sessionKey}, this.apiBaseUrl);
        this.logger.debug('Subscribed to chat');
    }

    private async subscribeToDonation(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        if (!sessionKey) return;

        await chzzkSessionApi.subscribeToDonation({sessionKey}, this.apiBaseUrl);
        this.logger.debug('Subscribed to donation');
    }

    private async subscribeToSubscription(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        if (!sessionKey) return;

        await chzzkSessionApi.subscribeToSubscription({sessionKey}, this.apiBaseUrl);
        this.logger.debug('Subscribed to subscription');
    }
}

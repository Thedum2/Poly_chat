import {EventEmitter} from 'events';
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

export class ChzzkAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'chzzk';
    private _isAuthenticated = false;
    private _isConnected = false;
    private clientId: string = '';
    private code: string = '';
    private clientSecret: string = '';
    private redirectUri: string = '';
    private authPopup: Window | null = null;
    private state: string = '';

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

        this._isAuthenticated = false;
        this._isConnected = false;
        try {
            destroySocket();
        } catch {
        }

        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.redirectUri = options.redirectUri;

        try {
            this.code = await this.openAuthPopup();
            console.log('[CHZZK] OAuth code received:');
            return;
        } catch (error) {
            console.error('[CHZZK] OAuth popup failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private openAuthPopup(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.state = uuidv4();
            const authUrl = chzzkAuthApi.getAuthCodeUrl({
                clientId: this.clientId,
                redirectUri: this.redirectUri,
                state: this.state,
            });

            this.authPopup = window.open(
                authUrl,
                'Chzzk OAuth',
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
                            console.log('[CHZZK] OAuth code received from URL:', code);
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

    async authenticate(options: ChzzkAuthOptions): Promise<void> {
        try {
            chzzkAuthStore.getState().setAuthOptions({
                clientId: options.clientId,
                clientSecret: options.clientSecret,
            });

            const state = options.state || this.state;
            if (!state) {
                throw new Error('State is required for authentication');
            }

            const tokens = await chzzkAuthApi.getAccessToken({
                grantType: 'authorization_code',
                clientId: options.clientId,
                clientSecret: options.clientSecret,
                code: this.code,
                state: state,
            });

            chzzkAuthStore.getState().setTokens({
                accessToken: tokens.content.accessToken,
                refreshToken: tokens.content.refreshToken,
            });

            this._isAuthenticated = true;
            this.emit('auth', true);
            console.log('ChzzkAdapter authenticated successfully.');
        } catch (error: any) {
            console.error('ChzzkAdapter authentication failed:', error);
            this._isAuthenticated = false;
            this.emit('auth', false);
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
            const sessionResponse = await chzzkSessionApi.createClientSession();
            this.opts.url = sessionResponse.content.url;

            const socket = getSocket(this.opts);
            socket.connect();

            socket.on('SYSTEM', async (raw: string) => {
                const result = chzzkMessageHandler.handleSystemMessage(raw);

                switch (result.type) {
                    case SYSTEM_MESSAGE_TYPE.CONNECTED: {
                        const connected = result as ConnectedMessageBody;
                        chzzkAuthStore.getState().setSessionKey(connected.data.sessionKey);

                        await this.subscribeAll();

                        this._isConnected = true;
                        this.emit('connected');
                        if (this.opts.debug) console.log('[CHZZK] connected & subscribed');
                        break;
                    }
                    case SYSTEM_MESSAGE_TYPE.SUBSCRIBED:
                        if (this.opts.debug) console.log('[CHZZK] subscribed');
                        break;
                    case SYSTEM_MESSAGE_TYPE.UNSUBSCRIBED:
                        if (this.opts.debug) console.log('[CHZZK] unsubscribed');
                        break;
                    case SYSTEM_MESSAGE_TYPE.REVOKED:
                        console.warn('[CHZZK] token/session revoked');
                        this.emit('error', new Error('Session revoked'));
                        break;
                    case SYSTEM_MESSAGE_TYPE.UNKNOWN:
                    default:
                        if (this.opts.debug) console.log('[CHZZK] system: unknown', result);
                        break;
                }
            });

            socket.on('CHAT', (raw: string) => {
                const chatEvent = chzzkMessageHandler.handleChatMessage(raw);

                const msg: ChatMessage = {
                    platform: PLATFORM_NAME.CHZZK,
                    chat_id: (chatEvent as any)?.messageId ?? 0,
                    nickname: chatEvent.profile?.nickname ?? 'unknown',
                    content: chatEvent.content ?? '',
                    timestamp: new Date((chatEvent as any)?.timestamp ?? Date.now()),
                };

                this.emit('message', msg);
            });

            socket.on('DONATION', (raw: string) => {
                const donation = chzzkMessageHandler.handleDonationMessage(raw);
                if (this.opts.debug) console.log('[CHZZK] donation:', donation);
                this.emit('donation', donation);
            });

            socket.on('SUBSCRIPTION', (raw: string) => {
                const sub = chzzkMessageHandler.handleSubscriptionMessage(raw);
                if (this.opts.debug) console.log('[CHZZK] subscription:', sub);
                this.emit('subscription', sub);
            });
        } catch (error) {
            console.error('Failed to connect to Chzzk:', error);
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
            console.log('ChzzkAdapter disconnected.');
        }
    }

    async logout(): Promise<void> {
        await this.disconnect();
        chzzkAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        this.emit('auth', false);
        console.log('ChzzkAdapter logged out.');
    }


    private async subscribeAll(): Promise<void> {
        await this.subscribeToChat();
        await this.subscribeToDonation();
        await this.subscribeToSubscription();
    }
    private async subscribeToChat(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        if (!sessionKey) return;

        await chzzkSessionApi.subscribeToChat({sessionKey});
        if (this.opts.debug) console.log('Subscribed to Chzzk chat');
    }

    private async subscribeToDonation(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        if (!sessionKey) return;

        await chzzkSessionApi.subscribeToDonation({sessionKey});
        if (this.opts.debug) console.log('Subscribed to Chzzk donation');
    }

    private async subscribeToSubscription(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        if (!sessionKey) return;

        await chzzkSessionApi.subscribeToSubscription({sessionKey});
        if (this.opts.debug) console.log('Subscribed to Chzzk subscription');
    }
}

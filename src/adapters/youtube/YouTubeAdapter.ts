import {EventEmitter} from 'events';
import {IChatAdapter} from '../../ports/IChatAdapter';
import {YouTubeAuthOptions, YouTubeInitOptions} from '../../models/Auth';
import {youtubeAuthStore} from '../../store/youtubeAuthStore';
import {youtubeAuthApi} from '../../api/modules/youtube/auth';
import {youtubeLiveBroadcastApi} from '../../api/modules/youtube/liveBroadcast';
import {youtubeLiveChatApi} from '../../api/modules/youtube/liveChat';
import {ChatMessage} from '../../models/ChatMessage';
import {PLATFORM_NAME} from '../../api/config';
import {v4 as uuidv4} from 'uuid';

export class YouTubeAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'youtube';
    private _isAuthenticated = false;
    private _isConnected = false;
    private clientId: string = '';
    private clientSecret: string = '';
    private redirectUri: string = '';
    private authPopup: Window | null = null;
    private state: string = '';
    private liveChatId: string | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;
    private nextPageToken: string | null = null;
    private pollingIntervalMs: number = 5000; // 기본값 5초

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(options: YouTubeInitOptions): Promise<void> {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('YouTube adapter requires browser environment');
        }

        this._isAuthenticated = false;
        this._isConnected = false;

        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.redirectUri = options.redirectUri;

        if (options.pollingIntervalSeconds !== undefined) {
            if (options.pollingIntervalSeconds < 1 || options.pollingIntervalSeconds > 10) {
                throw new Error('pollingIntervalSeconds must be between 1 and 10 seconds');
            }
            this.pollingIntervalMs = options.pollingIntervalSeconds * 1000;
        }

        try {
            await this.openAuthPopup();
            console.log('[YouTube] OAuth popup completed, access token stored');
        } catch (error) {
            console.error('[YouTube] OAuth popup failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private openAuthPopup(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.state = uuidv4();
            const authUrl = youtubeAuthApi.getAuthCodeUrl({
                clientId: this.clientId,
                redirectUri: this.redirectUri,
                state: this.state,
            });
            console.log('[YouTube] Opening OAuth popup:', authUrl);

            this.authPopup = window.open(
                authUrl,
                'YouTube OAuth',
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

                        const hash = url.hash.substring(1);
                        const params = new URLSearchParams(hash);
                        const accessToken = params.get('access_token');
                        const state = params.get('state');

                        if (accessToken && state) {

                            if (state !== this.state) {
                                cleanup();
                                if (this.authPopup && !this.authPopup.closed) {
                                    this.authPopup.close();
                                }
                                reject(new Error('Invalid state - possible CSRF attack'));
                                return;
                            }

                            isResolved = true;
                            cleanup();
                            if (this.authPopup && !this.authPopup.closed) {
                                this.authPopup.close();
                            }
                            console.log('[YouTube] Access token:', accessToken);


                            youtubeAuthStore.getState().setTokens({
                                accessToken: accessToken,
                                refreshToken: '',
                            });

                            resolve('');
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

    async authenticate(options: YouTubeAuthOptions): Promise<void> {
        try {

            const accessToken = youtubeAuthStore.getState().accessToken;

            if (!accessToken) {
                throw new Error('No access token found. Please run init() first.');
            }

            this._isAuthenticated = true;
            console.log('[YouTube] Authenticated successfully.');
            this.emit('auth', true);
        } catch (error: any) {
            console.error('[YouTube] Authentication failed:', error);
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

        try {
            const accessToken = youtubeAuthStore.getState().accessToken;
            if (!accessToken) {
                throw new Error('No access token available');
            }

            const broadcastsResponse = await youtubeLiveBroadcastApi.listLiveBroadcasts(accessToken, {mine: true});

            if (broadcastsResponse.items.length === 0) {
                throw new Error('활성 방송을 찾을 수 없습니다. 라이브 스트리밍을 시작한 후 다시 시도해주세요.');
            }

            if (broadcastsResponse.items.length > 1) {
                throw new Error(`진행 중인 방송이 ${broadcastsResponse.items.length}개 있습니다. 방송은 1개만 지원합니다.`);
            }

            this.liveChatId = broadcastsResponse.items[0].snippet.liveChatId || null;

            if (!this.liveChatId) {
                throw new Error('라이브 채팅이 활성화되지 않았습니다.');
            }

            console.log('[YouTube] Live chat ID found:', this.liveChatId);

            this._isConnected = true;
            this.emit('connected');
            await this.startPolling();

            console.log('[YouTube] Connected and polling started.');
        } catch (error: any) {
            console.error('[YouTube] Connection failed:', error);
            this._isConnected = false;
            this.emit('error', error);
            throw error;
        }
    }

    private async startPolling(): Promise<void> {
        if (!this.liveChatId) return;

        const poll = async () => {
            try {
                const accessToken = youtubeAuthStore.getState().accessToken;
                if (!accessToken || !this.liveChatId) {
                    this.stopPolling();
                    return;
                }

                const response = await youtubeLiveChatApi.listLiveChatMessages(accessToken, {
                    liveChatId: this.liveChatId,
                    part: 'id,snippet,authorDetails',
                    pageToken: this.nextPageToken || undefined,
                });

                for (const item of response.items) {
                    if (item.snippet.type === 'textMessageEvent' && item.snippet.textMessageDetails) {
                        const msg: ChatMessage = {
                            platform: PLATFORM_NAME.YOUTUBE,
                            chat_id: item.id,
                            nickname: item.authorDetails?.displayName || 'Unknown',
                            content: item.snippet.textMessageDetails.messageText,
                            timestamp: new Date(item.snippet.publishedAt),
                        };
                        this.emit('message', msg);
                    }
                }

                this.nextPageToken = response.nextPageToken || null;

                // Use configured polling interval, fallback to API response or default
                const pollingInterval = this.pollingIntervalMs;
                this.pollingInterval = setTimeout(poll, pollingInterval);
            } catch (error) {
                console.error('[YouTube] Polling error:', error);
                this.emit('error', error);
                // Retry with configured polling interval
                this.pollingInterval = setTimeout(poll, this.pollingIntervalMs);
            }
        };

        await poll();
    }

    private stopPolling(): void {
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.nextPageToken = null;
    }

    async disconnect(): Promise<void> {
        try {
            this.stopPolling();
        } finally {
            this._isConnected = false;
            this.emit('disconnected');
            console.log('[YouTube] Disconnected.');
        }
    }

    async logout(): Promise<void> {
        await this.disconnect();
        youtubeAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        this.emit('auth', false);
        console.log('[YouTube] Logged out.');
    }
}

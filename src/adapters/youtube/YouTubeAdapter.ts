import {EventEmitter} from 'events';
import {IChatAdapter} from '../../ports/IChatAdapter';
import {YouTubeAuthOptions, YouTubeInitOptions} from '../../models/Auth';
import {youtubeAuthStore} from '../../store/youtubeAuthStore';
import {youtubeAuthApi} from '../../api/modules/youtube/auth';
import {youtubeLiveBroadcastApi} from '../../api/modules/youtube/liveBroadcast';
import {youtubeLiveChatStream, YouTubeStreamError} from '../../api/modules/youtube/liveChatStream';
import {ChatMessage} from '../../models/ChatMessage';
import {PLATFORM_NAME} from '../../api/config';
import {v4 as uuidv4} from 'uuid';
import {createLogger} from '../../utils/logger';
import {youtubeChannelApi} from "../../api/modules/youtube/channel";

export class YouTubeAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'youtube';
    private _isAuthenticated = false;
    private _isConnected = false;
    private clientId: string = '';
    private redirectUri: string = '';
    private authPopup: Window | null = null;
    private state: string = '';
    private streamUrl = '/api/youtube/chat/stream';
    private streamController: AbortController | null = null;
    private logger = createLogger('[YouTube]');

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

        this.stopStreaming();
        this._isAuthenticated = false;
        this._isConnected = false;

        this.clientId = options.clientId;
        this.redirectUri = options.redirectUri;

        this.streamUrl = options.streamUrl?.trim() || '/api/youtube/chat/stream';

        try {
            if (new URL(this.redirectUri).origin !== window.location.origin) {
                throw new Error(`콜백 주소는 현재 페이지와 같은 출처여야 합니다. ${window.location.origin}/callback 을 사용해주세요.`);
            }
            await this.openAuthPopup();
            this.logger.info('OAuth popup completed');
            this.emit('initialized');
        } catch (error) {
            this.logger.error('OAuth popup failed:', error);
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
            this.logger.debug('Opening OAuth popup');

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
                        const callbackUrl = new URL(this.redirectUri);
                        if (url.origin !== callbackUrl.origin || url.pathname !== callbackUrl.pathname) {
                            return;
                        }

                        const hash = url.hash.substring(1);
                        const params = new URLSearchParams(hash);
                        const accessToken = params.get('access_token');
                        const oauthError = params.get('error') || url.searchParams.get('error');
                        const state = params.get('state') || url.searchParams.get('state');

                        if (accessToken || oauthError) {
                            isResolved = true;
                            cleanup();
                            if (this.authPopup && !this.authPopup.closed) {
                                this.authPopup.close();
                            }

                            if (!state || state !== this.state) {
                                reject(new Error('Invalid state - possible CSRF attack'));
                                return;
                            }

                            if (oauthError) {
                                reject(new Error(oauthError === 'access_denied'
                                    ? 'YouTube 로그인이 취소되었거나 권한이 거부되었습니다. (access_denied) 다시 초기화해주세요.'
                                    : `YouTube OAuth 인증에 실패했습니다. (${oauthError})`));
                                return;
                            }

                            youtubeAuthStore.getState().setTokens({
                                accessToken: accessToken!,
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

            try {
                const channelInfo = await youtubeChannelApi.getChannelInfo();

                if (channelInfo.items && channelInfo.items.length > 0) {
                    const channel = channelInfo.items[0];
                    this._isAuthenticated = true;
                    this.emit('auth', {
                        nickname: channel.snippet.title,
                        profileImageUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url
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
        if (!this._isAuthenticated) {
            throw new Error('Authentication is required before connecting.');
        }
        this.stopStreaming();
        this._isConnected = false;
        const controller = new AbortController();
        this.streamController = controller;
        const {signal} = controller;
        const connectedAt = Date.now();
        try {
            const accessToken = youtubeAuthStore.getState().accessToken;
            if (!accessToken) throw new Error('No access token available');
            const broadcasts = await youtubeLiveBroadcastApi.listLiveBroadcasts(accessToken, {mine: true}, signal);
            if (signal.aborted) return;
            const liveChatId = broadcasts.items.find(item => item.snippet.liveChatId)?.snippet.liveChatId;
            if (!liveChatId) throw new Error('라이브 채팅을 찾을 수 없습니다. 라이브 스트리밍을 시작한 후 다시 시도해주세요.');
            await this.startStreaming(liveChatId, connectedAt, controller);
        } catch (error) {
            if (signal.aborted) return;
            this.stopStreaming();
            this._isConnected = false;
            this.logger.error('Connection failed:', error);
            this.emit('error', error);
            throw error;
        }
    }

    private startStreaming(liveChatId: string, connectedAt: number, controller: AbortController): Promise<void> {
        const {signal} = controller;
        let nextPageToken: string | undefined;
        const seen = new Set<string>();
        let ready = false;
        let resolveReady!: () => void;
        let rejectReady!: (error: unknown) => void;
        const pending = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
        const cancelled = () => resolveReady();
        signal.addEventListener('abort', cancelled, {once: true});

        const receive = async () => {
            let retryDelay = 1000;
            while (!signal.aborted) {
                const startedAt = Date.now();
                try {
                    const accessToken = youtubeAuthStore.getState().accessToken;
                    if (!accessToken) throw new YouTubeStreamError('YouTube에 다시 로그인해주세요.', 401, false);
                    await youtubeLiveChatStream.receive({
                        url: this.streamUrl, accessToken, liveChatId, pageToken: nextPageToken, signal,
                        onReady: () => {
                            if (signal.aborted || ready) return;
                            ready = true;
                            this._isConnected = true;
                            resolveReady();
                            this.emit('connected');
                            this.logger.info('Realtime stream connected');
                        },
                        onBatch: (batch) => {
                            if (signal.aborted) return;
                            for (const item of batch.items) {
                                if (signal.aborted) return;
                                const publishedAt = Date.parse(item.snippet?.publishedAt);
                                if (!Number.isFinite(publishedAt) || publishedAt < connectedAt) continue;
                                if (item.snippet.type !== 'textMessageEvent' || !item.snippet.textMessageDetails || !item.id || seen.has(item.id)) continue;
                                seen.add(item.id);
                                if (seen.size > 5000) seen.delete(seen.values().next().value!);
                                const msg: ChatMessage = {
                                    platform: PLATFORM_NAME.YOUTUBE,
                                    chat_id: item.id,
                                    nickname: item.authorDetails?.displayName || 'Unknown',
                                    content: item.snippet.textMessageDetails.messageText,
                                    timestamp: new Date(publishedAt),
                                };
                                this.emit('message', msg);
                            }
                            if (signal.aborted) return;
                            if (batch.nextPageToken) nextPageToken = batch.nextPageToken;
                            if (batch.offlineAt) void this.disconnect();
                        },
                    });
                } catch (error) {
                    if (signal.aborted) return;
                    const retryable = error instanceof YouTubeStreamError ? error.retryable : error instanceof TypeError;
                    if (!retryable) throw error;
                    this.logger.warn('Realtime stream interrupted; reconnecting');
                }
                if (signal.aborted) return;
                if (Date.now() - startedAt >= 30000) retryDelay = 1000;
                await this.waitForRetry(retryDelay, signal);
                retryDelay = Math.min(retryDelay * 2, 30000);
            }
        };
        void receive().catch(error => {
            if (signal.aborted) return;
            if (!ready) {
                rejectReady(error);
            } else {
                this.stopStreaming();
                this._isConnected = false;
                this.emit('disconnected');
                this.logger.error('Realtime stream failed:', error);
                this.emit('error', error);
            }
        }).finally(() => signal.removeEventListener('abort', cancelled));
        return pending;
    }

    private waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
        return new Promise(resolve => {
            const finish = () => {
                clearTimeout(timer);
                signal.removeEventListener('abort', finish);
                resolve();
            };
            const timer = setTimeout(finish, delay);
            signal.addEventListener('abort', finish, {once: true});
            if (signal.aborted) finish();
        });
    }

    private stopStreaming(): void {
        this.streamController?.abort();
        this.streamController = null;
    }

    async disconnect(): Promise<void> {
        this.stopStreaming();
        this._isConnected = false;
        this.emit('disconnected');
        this.logger.info('Disconnected');
    }

    async logout(): Promise<void> {
        await this.disconnect();
        youtubeAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        this.emit('auth', null);
        this.logger.info('Logged out');
    }
}

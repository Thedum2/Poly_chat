import {EventEmitter} from "events";
import {IChatAdapter} from "../../ports/IChatAdapter";
import {chzzkSessionApi} from "../../api/modules/chzzk/session";
import {SocketClientOptions} from "../../sio/socket";
import {ChzzkAuthOptions} from "../../models/Auth";
import {chzzkAuthApi} from "../../api/modules/chzzk/auth";
import {chzzkAuthStore} from "../../store/chzzkAuthStore";
import {SYSTEM_MESSAGE_TYPE} from "../../api/model/chzzk/chzzkMessage";
import {chzzkMessageHandler} from "./chzzkMessageHandler";
import {destroySocket, getSocket} from "../../sio/singleton";
import {PLATFORM_NAME} from "../../api/config";

export class ChzzkAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'chzzk';
    private _isAuthenticated = false;
    private _isConnected = false;

    private opts = {
        url: '',
        transports: ['websocket'],
        forceNew: true,
        debug: true,
        timeout: 3000
    } as SocketClientOptions;

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(): Promise<void> {
        this._isAuthenticated = false;
        this._isConnected = false;
        destroySocket();
        console.log('ChzzkAdapter inited.');
    }

    async authenticate(options: ChzzkAuthOptions): Promise<void> {
        try {
            chzzkAuthStore.getState().setAuthOptions({
                clientId: options.clientId,
                clientSecret: options.clientSecret,
            });

            const tokenIssueResponse = await chzzkAuthApi.getAccessToken({
                grantType: 'authorization_code',
                clientId: options.clientId,
                clientSecret: options.clientSecret,
                code: options.code,
                state: options.state,
            });

            chzzkAuthStore.getState().setTokens({
                accessToken: tokenIssueResponse.accessToken,
                refreshToken: tokenIssueResponse.refreshToken,
            });

            this._isAuthenticated = true;
            console.log('ChzzkAdapter authenticated.');
        } catch (error) {
            console.error('ChzzkAdapter authentication failed:', error);
            this._isAuthenticated = false;
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
            this.opts.url = sessionResponse.url;

            getSocket(this.opts).connect();

            getSocket(this.opts).on('connect', async () => { });
            getSocket(this.opts).on('SYSTEM', async (data: string) => {
                const result = chzzkMessageHandler.handleSystemMessage(data);
                switch (result.type) {
                    case SYSTEM_MESSAGE_TYPE.CONNECTED:
                        chzzkAuthStore.getState().setSessionKey(result.sessionKey);
                        this._isConnected = true;
                        await this.subscribeAll();
                        break;
                    case SYSTEM_MESSAGE_TYPE.SUBSCRIBED:
                        break;
                    case SYSTEM_MESSAGE_TYPE.UNSUBSCRIBED:
                        break;
                    case SYSTEM_MESSAGE_TYPE.REVOKED:
                        break;
                    case SYSTEM_MESSAGE_TYPE.UNKNOWN:
                        break;
                }
            });

            getSocket(this.opts).on('CHAT', (data: string) => {
                const chatEventMessage = chzzkMessageHandler.handleChatMessage(data);
                const chatMessage =  {
                    platform: PLATFORM_NAME.CHZZK,
                    chat_id: 0,
                    nickname: chatEventMessage.profile.nickname,
                    content: chatEventMessage.content,
                    timestamp: new Date(),
                };
                this.emit('message', chatMessage);
            });
            getSocket(this.opts).on('DONATION', (data: string) => {
                const donationMessage = chzzkMessageHandler.handleDonationMessage(data);
            });
            getSocket(this.opts).on('SUBSCRIPTION', (data: string) => {
                const subscriptionMessage = chzzkMessageHandler.handleSubscriptionMessage(data);
            });
        } catch (error) {
            console.error('Failed to connect to Chzzk:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        destroySocket()
        this._isConnected = false;
    }

    async logout(): Promise<void> {
        await this.disconnect();
        chzzkAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        console.log('ChzzkAdapter logged out.');
    }


    private async subscribeAll(): Promise<void> {
        await this.subscribeToChat();
        await this.subscribeToDonation();
        await this.subscribeToSubscription();
    }

    private getAccessTokenOrThrow(): string {
        const t = chzzkAuthStore.getState().accessToken;
        if (!t) throw new Error('No accessToken in store');
        return t;
    }

    private async subscribeToChat(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        const channelId = chzzkAuthStore.getState().channelId;

        if (!getSocket(this.opts) || !sessionKey || !channelId) return;

        await chzzkSessionApi.subscribeToChat({
            sessionKey,
        });
        console.log('Subscribed to Chzzk chat');
    }

    private async subscribeToDonation(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        const channelId = chzzkAuthStore.getState().channelId;

        if (!getSocket(this.opts) || !sessionKey || !channelId) return;

        await chzzkSessionApi.subscribeToDonation({
            sessionKey,
        });
        console.log('Subscribed to Chzzk donation');
    }

    private async subscribeToSubscription(): Promise<void> {
        const sessionKey = chzzkAuthStore.getState().sessionKey;
        const channelId = chzzkAuthStore.getState().channelId;

        if (!getSocket(this.opts) || !sessionKey || !channelId) return;

        await chzzkSessionApi.subscribeToSubscription({
            sessionKey,
        });
        console.log('Subscribed to Chzzk subscription');
    }
}

import {EventEmitter} from 'events';
import {IChatAdapter} from '../../ports/IChatAdapter';
import {AuthOptions, YouTubeAuthOptions} from '../../models/Auth';
import {youtubeAuthStore} from '../../store/youtubeAuthStore';

export class YouTubeAdapter extends EventEmitter implements IChatAdapter {
    readonly platform = 'youtube';
    private _isAuthenticated = false;
    private _isConnected = false;

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    async init(): Promise<void> {

    }

    async authenticate(options: YouTubeAuthOptions): Promise<void> {
        // TODO: YouTube 인증 로직 구현 필요
        console.log('YouTubeAdapter authenticated');
    }

    async connect(): Promise<void> {
        this._isConnected = true;
        console.log(`YouTubeAdapter connected to channel`);
    }

    async disconnect(): Promise<void> {
        this._isConnected = false;
        console.log('YouTubeAdapter disconnected');
    }

    async logout(): Promise<void> {
        youtubeAuthStore.getState().clearTokens();
        this._isAuthenticated = false;
        console.log('YouTubeAdapter logged out.');
    }
}

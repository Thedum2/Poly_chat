import {EventEmitter} from 'events';
import {IChatAdapter} from '../ports/IChatAdapter';
import {AuthOptions} from '../models/Auth';
import {ChatMessage} from '../models/ChatMessage';
import generateRandomKoreanWords from "../util";

export class ChzzkAdapter extends EventEmitter implements IChatAdapter {

    readonly platform = 'chzzk';
    private _isAuthenticated = false;
    private _isConnected = false;

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    private messageInterval: NodeJS.Timeout | null = null;

    async authenticate(options: AuthOptions): Promise<void> {
        this._isAuthenticated=true;
        console.log(`ChzzkAdapter authenticated.`);
    }


    async connect(channelId: string): Promise<void> {
        this._isConnected = true;
        console.log('ChzzkAdapter connected to channel')

        this.startTest();
    }

    async disconnect(): Promise<void> {
    }

    startTest(): void {
        if (this.messageInterval) {
            return;
        }
        this.messageInterval = setInterval(async () => {
            const testMessage = generateRandomKoreanWords();
            this.emit('message', {
                platform: this.platform,
                chat_id: 'test',
                nickname: 'TestUser',
                content: testMessage,
                timestamp: new Date(),
            } as ChatMessage);
        }, 5000);
    }
}

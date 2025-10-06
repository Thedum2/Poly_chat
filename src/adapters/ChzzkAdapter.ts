import {EventEmitter} from 'events';
import {IChatAdapter} from '../ports/IChatAdapter';
import {AuthOptions, ChzzkAuthOptions} from '../models/Auth';
import {ChatMessage} from '../models/ChatMessage';
import {User} from '../models/User';

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

    async authenticate(options: AuthOptions): Promise<void> {
        this._isAuthenticated=true;
        console.log(`ChzzkAdapter authenticated.`);
    }


    async connect(channelId: string): Promise<void> {
        this._isConnected = true;
        console.log('ChzzkAdapter connected to channel')
    }

    async disconnect(): Promise<void> {

    }

    async test(): Promise<string>{
        return 'Hello World from ChzzkAdapter';
    }
}

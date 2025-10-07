import {EventEmitter} from 'events';
import {IChatAdapter} from '../ports/IChatAdapter';
import {AuthOptions} from '../models/Auth';

export class SoopAdapter extends EventEmitter implements IChatAdapter {

    readonly platform = 'soop';
    private _isAuthenticated = false;
    private _isConnected = false;

    get isAuthenticated(): boolean {
        return this._isAuthenticated;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }
    async authenticate(options: AuthOptions): Promise<void>{}
    async connect(channelId: string): Promise<void>{}
    async disconnect(): Promise<void>{}
}

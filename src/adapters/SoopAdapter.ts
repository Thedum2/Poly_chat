import { EventEmitter } from 'events';
import { IChatAdapter } from '../ports/IChatAdapter';
import { AuthOptions, SoopAuthOptions } from '../models/Auth';
import { ChatMessage } from '../models/ChatMessage';
import { User } from '../models/User';

export class SoopAdapter extends EventEmitter implements IChatAdapter {
  readonly platform = 'soop';
  private auth: SoopAuthOptions | null = null;
  private channelId: string | null = null;
  private messageInterval: NodeJS.Timeout | null = null;

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
    console.log(`SoopAdapter authenticated.`);
  }

  async connect(channelId: string): Promise<void> {
      this._isConnected = true;
    console.log(`SoopAdapter connected to channel: ${this.channelId}`);
  }

  async disconnect(): Promise<void> {
    console.log('SoopAdapter disconnected');
  }

  async test(): Promise<string> {
    return 'SOOP adapter test successful';
  }
}

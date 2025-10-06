import { EventEmitter } from 'events';
import { IChatAdapter } from '../ports/IChatAdapter';
import { AuthOptions, YouTubeAuthOptions } from '../models/Auth';
import { ChatMessage } from '../models/ChatMessage';
import { User } from '../models/User';

export class YouTubeAdapter extends EventEmitter implements IChatAdapter {
  readonly platform = 'youtube';
  private apiKey: string | null = null;
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
    console.log(`YouTubeAdapter authenticated`);
  }

  async connect(channelId: string): Promise<void> {
      this._isConnected=true;
    console.log(`YouTubeAdapter connected to channel: ${this.channelId}`);
  }
  async disconnect(): Promise<void> {

    console.log('YouTubeAdapter disconnected');
  }

  async test(): Promise<string> {
    return 'YouTube adapter test successful';
  }
}
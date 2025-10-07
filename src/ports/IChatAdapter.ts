import { AuthOptions } from '../models/Auth';
import { ChatMessage } from '../models/ChatMessage';

export interface IChatAdapter {
  readonly platform: string;
  readonly isAuthenticated: boolean;
  readonly isConnected: boolean;

  authenticate(options: AuthOptions): Promise<void>;
  connect(channelId: string): Promise<void>;
  disconnect(): Promise<void>;

  on(event: 'message', listener: (message: ChatMessage) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}
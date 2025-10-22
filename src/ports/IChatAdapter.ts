import { AuthOptions, InitOptions } from '../models/Auth';
import { ChatMessage, BroadcasterInfo } from '../models/ChatMessage';

export interface IChatAdapter {
  readonly platform: string;
  readonly isAuthenticated: boolean;
  readonly isConnected: boolean;

  init(options: InitOptions): Promise<void>;
  authenticate(options: AuthOptions): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  on(event: 'message', listener: (message: ChatMessage) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'connected', listener: () => void): this;
  on(event: 'auth', listener: (broadcasterInfo: BroadcasterInfo | null) => void): this;
  on(event: 'disconnected', listener: () => void): this;
  on(event: 'initialized', listener: () => void): this;
}
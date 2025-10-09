import { AuthOptions, InitOptions } from '../models/Auth';
import { ChatMessage } from '../models/ChatMessage';

export interface IChatAdapter {
  readonly platform: string;
  readonly isAuthenticated: boolean;
  readonly isConnected: boolean;

  init(options: InitOptions): Promise<void | string>; // init can return void (for redirect) or string (for popup code)
  authenticate(options: AuthOptions): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  on(event: 'message', listener: (message: ChatMessage) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'connected', listener: () => void): this;
  on(event: 'auth', listener: (isAuthenticated: boolean) => void): this;
  on(event: 'disconnected', listener: () => void): this;
}
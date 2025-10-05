export interface IChatAdapter {
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      test(): Promise<string>;
    }
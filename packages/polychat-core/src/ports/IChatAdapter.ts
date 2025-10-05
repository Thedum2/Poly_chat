export interface ChatMessage {
  platform: string;
  message: string;
}

export interface IChatAdapter {
  getPlatform(): string;
  fetchMessage(): Promise<string>;
}

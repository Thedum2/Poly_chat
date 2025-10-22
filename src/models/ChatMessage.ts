export interface ChatMessage {
  platform: string;
  chat_id: string;
  nickname:string;
  content: string;
  timestamp: Date;
}

export interface BroadcasterInfo {
  nickname: string;
  profileImageUrl: string;
}


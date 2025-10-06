import { User } from './User';

export interface ChatMessage {
  platform: string;
  id: string;
  author: User;
  content: string;
  timestamp: Date;
}

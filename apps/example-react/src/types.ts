import type { BroadcasterInfo, ChzzkAdapter, SoopAdapter, YouTubeAdapter } from 'polychat-bridge';

export type Platform = 'chzzk' | 'soop' | 'youtube';

export interface PlatformConfig {
  clientId: string;
  redirectUri?: string;
}

export interface AdapterState {
  adapter: ChzzkAdapter | SoopAdapter | YouTubeAdapter;
  status: 'disconnected' | 'initialized' | 'authenticated' | 'connected';
  error: string;
  isInitializing?: boolean;
  config: PlatformConfig;
  broadcasterInfo?: BroadcasterInfo | null;
}

export interface DisplayMessage {
  platform: Platform;
  type: 'chat' | 'system';
  nickname: string;
  content: string;
  timestamp: Date;
  chat_id?: string;
}

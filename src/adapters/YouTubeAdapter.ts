import { IChatAdapter } from '../ports/IChatAdapter';

    export class YouTubeAdapter implements IChatAdapter {
      async connect(): Promise<void> {
        console.log('YouTube adapter connected');
      }

      async disconnect(): Promise<void> {
        console.log('YouTube adapter disconnected');
      }

      async test(): Promise<string> {
        return 'YouTube adapter test successful';
      }
    }
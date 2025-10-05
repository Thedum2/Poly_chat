import { IChatAdapter } from '../ports/IChatAdapter';

    export class ChzzkAdapter implements IChatAdapter {
      async connect(): Promise<void> {
        console.log('Chzzk adapter connected');
      }

      async disconnect(): Promise<void> {
        console.log('Chzzk adapter disconnected');
      }

      async test(): Promise<string> {
        return 'Chzzk adapter test successful';
      }
    }
import { IChatAdapter } from '../ports/IChatAdapter';

    export class SoopAdapter implements IChatAdapter {
      async connect(): Promise<void> {
        console.log('Soop adapter connected');
      }

      async disconnect(): Promise<void> {
        console.log('Soop adapter disconnected');
      }

      async test(): Promise<string> {
        return 'Soop adapter test successful';
      }
    }
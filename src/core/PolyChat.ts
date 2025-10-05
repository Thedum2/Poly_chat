import { IChatAdapter } from '../ports/IChatAdapter';

    export class PolyChat {
      private readonly adapters: IChatAdapter[] = [];

      constructor(adapters: IChatAdapter[]) {
        this.adapters = adapters;
      }

      async connectAll(): Promise<void> {
        for (const adapter of this.adapters) {
          await adapter.connect();
        }
      }

      async disconnectAll(): Promise<void> {
        for (const adapter of this.adapters) {
          await adapter.disconnect();
        }
      }

      async testAll(): Promise<string[]> {
        const results: string[] = [];
        for (const adapter of this.adapters) {
          results.push(await adapter.test());
        }
        return results;
      }
    }
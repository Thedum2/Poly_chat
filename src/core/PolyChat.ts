import { EventEmitter } from 'events';
import { IChatAdapter } from '../ports/IChatAdapter';
import { ChatMessage } from '../models/ChatMessage';

export class PolyChat extends EventEmitter {
  private readonly adapters: Map<string, IChatAdapter> = new Map();

  constructor() {
    super();
  }

  public registerAdapter(adapter: IChatAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      console.warn(`Adapter for platform '${adapter.platform}' is already registered.`);
      return;
    }
    this.adapters.set(adapter.platform, adapter);
    this.listenToAdapterEvents(adapter);
    console.log(`Adapter for ${adapter.platform} registered.`);
  }

  private listenToAdapterEvents(adapter: IChatAdapter): void {
    adapter.on('message', (message: ChatMessage) => {
      this.emit('message', message);
    });
    adapter.on('error', (error: Error) => {
      this.emit('error', { platform: adapter.platform, error });
    });
  }

  public getAdapter(platform: string): IChatAdapter | undefined {
    return this.adapters.get(platform);
  }

  async testAll() {
      for (const adapter of this.adapters.values()) {
          await adapter.test();
      }
  }
  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect();
    }
  }
}
import { ChatMessage, IChatAdapter } from '../ports/IChatAdapter';

export class PolyChat {
  private readonly adapters: IChatAdapter[] = [];

  constructor(adapters: IChatAdapter[] = []) {
    this.adapters.push(...adapters);
  }

  registerAdapter(adapter: IChatAdapter): void {
    this.adapters.push(adapter);
  }

  listPlatforms(): string[] {
    return this.adapters.map(adapter => adapter.getPlatform());
  }

  async fetchAllMessages(): Promise<ChatMessage[]> {
    return Promise.all(
      this.adapters.map(async adapter => ({
        platform: adapter.getPlatform(),
        message: await adapter.fetchMessage()
      }))
    );
  }
}

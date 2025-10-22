import { EventEmitter } from 'events';
import { IChatAdapter } from './ports/IChatAdapter';
import { ChatMessage, BroadcasterInfo } from './models/ChatMessage';
import { createLogger } from './utils/logger';

export interface PolyChatEvents {
  message: (data: { platform: string; message: ChatMessage }) => void;
  error: (data: { platform: string; error: Error }) => void;
  connected: (data: { platform: string }) => void;
  auth: (data: { platform: string; broadcasterInfo: BroadcasterInfo | null }) => void;
  disconnected: (data: { platform: string }) => void;
  initialized: (data: { platform: string }) => void;
}

export class PolyChat extends EventEmitter {
  private readonly adapters: Map<string, IChatAdapter> = new Map();
  private logger = createLogger('[PolyChat]');

  constructor() {
    super();
  }

  public registerAdapter(adapter: IChatAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      this.logger.warn(`Adapter for platform '${adapter.platform}' is already registered`);
      return;
    }
    this.adapters.set(adapter.platform, adapter);
    this.listenToAdapterEvents(adapter);
    this.logger.info(`Adapter for ${adapter.platform} registered`);
  }

  private listenToAdapterEvents(adapter: IChatAdapter): void {
    adapter.on('message', (message: ChatMessage) => {
      this.emit('message', { platform: adapter.platform, message });
    });

    adapter.on('error', (error: Error) => {
      this.emit('error', { platform: adapter.platform, error });
    });

    adapter.on('connected', () => {
      this.emit('connected', { platform: adapter.platform });
    });

    adapter.on('auth', (broadcasterInfo: BroadcasterInfo | null) => {
      this.emit('auth', { platform: adapter.platform, broadcasterInfo });
    });

    adapter.on('disconnected', () => {
      this.emit('disconnected', { platform: adapter.platform });
    });

    adapter.on('initialized', () => {
      this.emit('initialized', { platform: adapter.platform });
    });
  }

  public getAdapter(platform: string): IChatAdapter | undefined {
    return this.adapters.get(platform);
  }

  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect();
    }
  }

  // Type-safe event emitter methods
  public override on<K extends keyof PolyChatEvents>(
    event: K,
    listener: PolyChatEvents[K]
  ): this {
    return super.on(event, listener);
  }

  public override emit<K extends keyof PolyChatEvents>(
    event: K,
    ...args: Parameters<PolyChatEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  public override off<K extends keyof PolyChatEvents>(
    event: K,
    listener: PolyChatEvents[K]
  ): this {
    return super.off(event, listener);
  }
}
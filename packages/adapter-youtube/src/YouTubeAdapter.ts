import { IChatAdapter } from "@polychat/core";

export class YouTubeAdapter implements IChatAdapter {
  private readonly platform = "youtube";

  getPlatform(): string {
    return this.platform;
  }

  async fetchMessage(): Promise<string> {
    return "Sample message from YouTube";
  }
}

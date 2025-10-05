import { IChatAdapter } from "@polychat/core";

export class SoopAdapter implements IChatAdapter {
  private readonly platform = "soop";

  getPlatform(): string {
    return this.platform;
  }

  async fetchMessage(): Promise<string> {
    return "Sample message from Soop";
  }
}

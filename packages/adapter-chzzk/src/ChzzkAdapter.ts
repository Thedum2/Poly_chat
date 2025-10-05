import { IChatAdapter } from "@polychat/core";

export class ChzzkAdapter implements IChatAdapter {
  private readonly platform = "chzzk";

  getPlatform(): string {
    return this.platform;
  }

  async fetchMessage(): Promise<string> {
    return "Sample message from Chzzk";
  }
}

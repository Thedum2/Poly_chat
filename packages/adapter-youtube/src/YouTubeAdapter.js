export class YouTubeAdapter {
    constructor() {
        this.platform = "youtube";
    }
    getPlatform() {
        return this.platform;
    }
    async fetchMessage() {
        return "Sample message from YouTube";
    }
}

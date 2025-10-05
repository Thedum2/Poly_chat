export class SoopAdapter {
    constructor() {
        this.platform = "soop";
    }
    getPlatform() {
        return this.platform;
    }
    async fetchMessage() {
        return "Sample message from Soop";
    }
}

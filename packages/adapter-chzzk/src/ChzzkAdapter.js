export class ChzzkAdapter {
    constructor() {
        this.platform = "chzzk";
    }
    getPlatform() {
        return this.platform;
    }
    async fetchMessage() {
        return "Sample message from Chzzk";
    }
}

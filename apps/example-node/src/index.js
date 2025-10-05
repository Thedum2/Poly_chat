import { PolyChat } from "@polychat/core";
import { ChzzkAdapter } from "@polychat/adapter-chzzk";
import { YouTubeAdapter } from "@polychat/adapter-youtube";
import { SoopAdapter } from "@polychat/adapter-soop";
async function main() {
    const polychat = new PolyChat();
    polychat.registerAdapter(new ChzzkAdapter());
    polychat.registerAdapter(new YouTubeAdapter());
    polychat.registerAdapter(new SoopAdapter());
    console.log("Registered platforms:", polychat.listPlatforms().join(", "));
    const messages = await polychat.fetchAllMessages();
    console.log("Messages gathered from adapters:");
    messages.forEach(({ platform, message }) => {
        console.log(`[${platform}] ${message}`);
    });
}
main().catch(error => {
    console.error("An error occurred:", error);
    process.exit(1);
});

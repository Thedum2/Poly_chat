import { socket, SocketClient, SocketClientOptions } from "./socket";

let instance: SocketClient | null = null;
let lastUrl: string | null = null;

export function getSocket(opts: SocketClientOptions): SocketClient {
    if (instance && lastUrl === opts.url) {
        return instance;
    }
    if (instance) {
        try { instance.disconnect(); } catch {}
    }
    instance = socket(opts);
    lastUrl = opts.url;
    return instance;
}

export function destroySocket() {
    if (instance) {
        try { instance.disconnect(); } catch {}
        instance = null;
        lastUrl = null;
    }
}

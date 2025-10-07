import io from "socket.io-client";

export type SocketClientOptions = {
    url: string;
    transports?: Array<"websocket" | "polling">;
    forceNew?: boolean;
    debug?: boolean;
    timeout?: number;
};

export function socket({
                           url,
                           transports,
                           forceNew,
                           debug,
                           timeout
                       }: SocketClientOptions) {
    console.log(`[socket] Connecting to url: "${url}" with options:`, { transports, forceNew, timeout });
    const s = io(url, { transports, forceNew, timeout});

    if (debug) {
        s.on("connect", () => console.log("[sio] connect:", s.id));
        s.on("disconnect", (r: string) => console.log("[sio] disconnect:", r));
        s.on("connect_error", (e: any) =>
            console.log("[sio] connect_error:", e?.message || e)
        );
        s.on("reconnect_attempt", (n: number) =>
            console.log("[sio] reconnect_attempt:", n)
        );
        s.on("reconnect", (n: number) => console.log("[sio] reconnect:", n));
    }

    let originalOnevent: any | null = null;
    const enableOnAny = (cb: (event: string, ...args: any[]) => void) => {
        if ((s as any).onevent && !originalOnevent) {
            originalOnevent = (s as any).onevent;
            (s as any).onevent = function (packet: any) {
                const args = packet.data || [];
                if (Array.isArray(args) && args.length) {
                    const [eventName, ...rest] = args;
                    try {
                        cb(eventName, ...rest);
                    } catch {}
                }
                originalOnevent!.call(this, packet);
            };
        }
    };
    const disableOnAny = () => {
        if (originalOnevent) {
            (s as any).onevent = originalOnevent;
            originalOnevent = null;
        }
    };

    const on = (event: string, listener: (...args: any[]) => void) => {
        s.on(event, listener);
        return () => s.off(event, listener);
    };

    const once = (event: string, listener: (...args: any[]) => void) => {
        s.once(event, listener);
        return () => s.off(event, listener);
    };

    const off = (event?: string, listener?: (...args: any[]) => void) => {
        if (event && listener) s.off(event, listener);
        else if (event) (s as any).off(event); // v2: off(event) => 해당 이벤트 전체 제거
        else {
            (s as any).callbacks = {};
        }
    };

    const onAnyWrap = (cb: (event: string, ...args: any[]) => void) => {
        enableOnAny(cb);
        return () => disableOnAny();
    };

    const emit = (event: string, ...args: any[]) => s.emit(event, ...args);

    const emitAck = <T = any>(event: string, ...args: any[]) =>
        new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("ACK_TIMEOUT")), 10_000);
            s.emit(event, ...args, (res: T) => {
                clearTimeout(timer);
                resolve(res);
            });
        });

    const connect = () => s.connect();
    const disconnect = () => s.disconnect();

    return {
        socket: s,
        on,
        once,
        off,
        onAny: onAnyWrap,
        offAny: disableOnAny,
        emit,
        emitAck,
        connect,
        disconnect,
    };
}

export type SocketClient = ReturnType<typeof socket>;

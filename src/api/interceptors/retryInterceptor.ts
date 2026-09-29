import {CanceledError, isCancel, type AxiosError, type AxiosInstance, type GenericAbortSignal} from "axios";

const sleep = (ms: number, signal?: GenericAbortSignal) => new Promise<void>((resolve, reject) => {
    const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener?.('abort', abort);
    };
    const abort = () => { cleanup(); reject(new CanceledError()); };
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    signal?.addEventListener?.('abort', abort, {once: true});
    if (signal?.aborted) abort();
});

export function installRetryInterceptor(instance: AxiosInstance, maxRetries = 2) {
    instance.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config: any = error.config;
        if (isCancel(error) || config?.signal?.aborted) return Promise.reject(error);
        if (!config || config.__retryCount >= maxRetries) return Promise.reject(error);

        const status = error.response?.status;
        const isNetwork = !error.response;
        const isTimeout = (error.code === "ECONNABORTED") || /timeout/i.test(String(error.message));
        const is429 = status === 429;
        if (isNetwork || isTimeout || is429) {
            config.__retryCount = (config.__retryCount || 0) + 1;
            const retryAfterHeader = (error.response?.headers as any)?.["retry-after"];
            const retryAfter = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
            const backoff = retryAfter || Math.min(2000 * 2 ** (config.__retryCount - 1), 8000);
            await sleep(backoff, config.signal);
            return instance(config);
        }
        return Promise.reject(error);
    });
}

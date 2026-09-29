import type { LiveChatMessage } from '../../model/youtube/liveChat';

export interface YouTubeChatBatch {
    items: LiveChatMessage[];
    nextPageToken?: string;
    offlineAt?: string;
}

export class YouTubeStreamError extends Error {
    constructor(message: string, readonly code: number | string, readonly retryable: boolean) {
        super(message);
        this.name = 'YouTubeStreamError';
    }
}

export interface YouTubeStreamOptions {
    url: string;
    accessToken: string;
    liveChatId: string;
    pageToken?: string;
    signal: AbortSignal;
    onReady: () => void;
    onBatch: (batch: YouTubeChatBatch) => void;
}

/** Fetch is used instead of EventSource so OAuth credentials stay in the header. */
async function receive(options: YouTubeStreamOptions): Promise<void> {
    const { signal } = options;
    const response = await fetch(options.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.accessToken}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ liveChatId: options.liveChatId, pageToken: options.pageToken }),
        signal,
        cache: 'no-store',
        redirect: 'error',
        credentials: 'omit',
    });
    if (!response.ok || !response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
        await response.body?.cancel();
        throw new YouTubeStreamError(`YouTube 실시간 중계 서버에 연결할 수 없습니다. (HTTP ${response.status}) 중계 주소와 서버 설정을 확인해주세요.`, response.status, response.status >= 500);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const abort = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    let buffer = '';
    let event = '';
    let data = '';
    const invalid = () => new YouTubeStreamError('YouTube 중계 서버가 올바르지 않은 스트림을 반환했습니다.', 'INVALID_STREAM', false);
    try {
        while (true) {
            signal.throwIfAborted();
            const { value, done } = await reader.read();
            signal.throwIfAborted();
            if (done) return;
            buffer += decoder.decode(value, { stream: true });
            let newline: number;
            while ((newline = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newline).replace(/\r$/, '');
                buffer = buffer.slice(newline + 1);
                if (line.length + data.length > 1024 * 1024) throw invalid();
                if (!line) {
                    if (data) {
                        let payload: any;
                        try { payload = JSON.parse(data); } catch { throw invalid(); }
                        if (!payload || typeof payload !== 'object') throw invalid();
                        if (event === 'ready') options.onReady();
                        else if (event === 'batch') {
                            if (!Array.isArray(payload.items)) throw invalid();
                            options.onBatch(payload);
                        } else if (event === 'error') {
                            throw new YouTubeStreamError(typeof payload.message === 'string' ? payload.message : 'YouTube 실시간 수신에 실패했습니다.', payload.code ?? 'UNKNOWN', payload.retryable === true);
                        } else if (event === 'end') return;
                        signal.throwIfAborted();
                    }
                    event = '';
                    data = '';
                } else if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).replace(/^ /, '');
            }
            if (buffer.length + data.length > 1024 * 1024) throw invalid();
        }
    } finally {
        signal.removeEventListener('abort', abort);
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
}

export const youtubeLiveChatStream = { receive };

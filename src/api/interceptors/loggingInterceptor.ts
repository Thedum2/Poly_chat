import type {AxiosInstance, InternalAxiosRequestConfig, AxiosResponse} from "axios";
import {createLogger} from '../../utils/logger';

const logger = createLogger('[HTTP]');

function requestPath(url?: string, baseURL?: string): string {
    try {
        return new URL(url || '', new URL(baseURL || '/', 'http://localhost')).pathname;
    } catch {
        return '';
    }
}

function safeDetail(value: string, config: any): string {
    const secrets: string[] = [];
    const headers = config?.headers;
    for (const key of ['Authorization', 'Client-Secret']) {
        const value = headers?.get?.(key) ?? headers?.[key];
        if (typeof value === 'string') secrets.push(value.replace(/^Bearer\s+/i, ''));
    }
    let body: any = config?.data;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = Object.fromEntries(new URLSearchParams(body)); }
    }
    if (body && typeof body === 'object') {
        for (const [key, value] of Object.entries(body)) {
            if (/secret|token|code|state|session/i.test(key) && typeof value === 'string') secrets.push(value);
        }
    }
    for (const secret of secrets) if (secret) value = value.split(secret).join('[redacted]');
    return value.replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]').slice(0, 1000);
}

export function installLoggingInterceptor(instance: AxiosInstance) {
    instance.interceptors.request.use((c: InternalAxiosRequestConfig) => {
        const path = requestPath(c.url, c.baseURL);
        logger.debug(`→ ${c.method?.toUpperCase()} ${path}`);
        return c;
    });
    instance.interceptors.response.use((r: AxiosResponse) => {
        const path = requestPath(r.config.url, r.config.baseURL);
        logger.debug(`← ${r.status} ${r.config.method?.toUpperCase()} ${path}`);
        return r;
    }, (err) => {
        const {config, response} = err || {};
        const path = requestPath(config?.url, config?.baseURL);
        const detail = response?.data?.error ?? response?.data;
        const reasons = Array.isArray(detail?.errors)
            ? detail.errors.map((entry: any) => entry?.reason).filter((reason: unknown) => typeof reason === 'string')
            : [];
        const message = typeof detail?.message === 'string' ? detail.message : err?.message;
        logger.error(
            `⨯ ${response?.status ?? "ERR"} ${config?.method?.toUpperCase()} ${path}`,
            safeDetail([message, ...reasons].filter(Boolean).join(' | '), config)
        );
        return Promise.reject(err);
    });
}

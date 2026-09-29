import type {AxiosInstance, InternalAxiosRequestConfig, AxiosResponse} from "axios";
import {createLogger} from '../../utils/logger';

const logger = createLogger('[HTTP]');

export function installLoggingInterceptor(instance: AxiosInstance) {
    instance.interceptors.request.use((c: InternalAxiosRequestConfig) => {
        logger.debug(`→ ${c.method?.toUpperCase()} ${c.baseURL}${c.url}`);
        return c;
    });
    instance.interceptors.response.use((r: AxiosResponse) => {
        logger.debug(`← ${r.status} ${r.config.method?.toUpperCase()} ${r.config.url}`);
        return r;
    }, (err) => {
        const {config, response} = err || {};
        const detail = response?.data?.error ?? response?.data;
        const reasons = Array.isArray(detail?.errors)
            ? detail.errors.map((entry: any) => entry?.reason).filter((reason: unknown) => typeof reason === 'string')
            : [];
        const message = typeof detail?.message === 'string' ? detail.message : err?.message;
        logger.error(
            `⨯ ${response?.status ?? "ERR"} ${config?.method?.toUpperCase()} ${config?.url}`,
            [message, ...reasons].filter(Boolean).join(' | ')
        );
        return Promise.reject(err);
    });
}

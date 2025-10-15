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
        logger.error(`⨯ ${response?.status ?? "ERR"} ${config?.method?.toUpperCase()} ${config?.url}`, response?.data ?? err?.message);
        return Promise.reject(err);
    });
}

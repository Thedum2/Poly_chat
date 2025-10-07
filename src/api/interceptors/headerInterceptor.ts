import type {AxiosInstance, InternalAxiosRequestConfig, AxiosResponse} from "axios";

export function installHeaderInterceptor(instance: AxiosInstance) {
    instance.interceptors.request.use((c: InternalAxiosRequestConfig) => {
        (c.headers as any)["Accept"] = "application/json";
        (c.headers as any)["Content-Type"] = "application/json";

        if (c.data instanceof FormData) {
            delete (c.headers as any)["Content-Type"];
        }

        return c;
    });

    instance.interceptors.response.use((r: AxiosResponse) => {
        return r;
    }, (err) => {
        return Promise.reject(err);
    });
}

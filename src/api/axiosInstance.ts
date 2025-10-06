import axios from "axios";
import {API_TIMEOUT_MS} from "./config";
import {installAuthInterceptor} from "./interceptors/authInterceptor";
import {installLoggingInterceptor} from "./interceptors/loggingInterceptor";
import {installRetryInterceptor} from "./interceptors/retryInterceptor";

const axiosInstance = axios.create({baseURL: '', timeout: API_TIMEOUT_MS});
axiosInstance.interceptors.request.use((c) => {
    (c.headers as any)["Accept"] = "application/json";
    return c;
});

console.log("[axios] created baseURL is"+ '');

installAuthInterceptor(axiosInstance);
installRetryInterceptor(axiosInstance);
installLoggingInterceptor(axiosInstance);

export {axiosInstance};

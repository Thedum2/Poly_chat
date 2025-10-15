import axios from "axios";
import {API_TIMEOUT_MS} from "./config";
import {installLoggingInterceptor} from "./interceptors/loggingInterceptor";
import {installRetryInterceptor} from "./interceptors/retryInterceptor";
import {installHeaderInterceptor} from "./interceptors/headerInterceptor";

const axiosInstance = axios.create({baseURL: '', timeout: API_TIMEOUT_MS});

installLoggingInterceptor(axiosInstance);
installHeaderInterceptor(axiosInstance);
installRetryInterceptor(axiosInstance);

export {axiosInstance};

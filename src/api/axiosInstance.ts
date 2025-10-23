import axios from "axios";
import {API_TIMEOUT_MS} from "./config";
import {installLoggingInterceptor} from "./interceptors/loggingInterceptor";
import {installRetryInterceptor} from "./interceptors/retryInterceptor";

const axiosInstance = axios.create({baseURL: '', timeout: API_TIMEOUT_MS});

installLoggingInterceptor(axiosInstance);
installRetryInterceptor(axiosInstance);

export {axiosInstance};

import type {AxiosRequestConfig} from "axios";
import {axiosInstance} from "./axiosInstance";

type Mapper<T> = (json: any) => T;

export const httpClient = {
    async get<T>(url: string, mapper: Mapper<T>, config?: AxiosRequestConfig): Promise<T> {
        try {
            const res = await axiosInstance.get(url, config);
            return mapper(res.data);
        } catch (e) {
            return 'Error' as any
        }
    },
    async getList<T>(url: string, mapper: Mapper<T>, config?: AxiosRequestConfig): Promise<T[]> {
        try {
            const res = await axiosInstance.get(url, config);
            const arr = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
            return arr.map(mapper);
        } catch (e) {
            return 'Error' as any
        }
    },
    async post<T>(url: string, body: any, mapper: Mapper<T>, config?: AxiosRequestConfig): Promise<T> {
        try {
            const res = await axiosInstance.post(url, body, config);
            return mapper(res.data);
        } catch (e) {
            return 'Error' as any
        }
    },
    async put<T>(url: string, body: any, mapper: Mapper<T>, config?: AxiosRequestConfig): Promise<T> {
        try {
            const res = await axiosInstance.put(url, body, config);
            return mapper(res.data);
        } catch (e) {
            return 'Error' as any
        }
    },
    async patch<T>(url: string, body: any, mapper: Mapper<T>, config?: AxiosRequestConfig): Promise<T> {
        try {
            const res = await axiosInstance.patch(url, body, config);
            return mapper(res.data);
        } catch (e) {
            return 'Error' as any
        }
    },
    async delete(url: string, config?: AxiosRequestConfig): Promise<void> {
        try {
            await axiosInstance.delete(url, config);
        } catch (e) {
            return 'Error' as any
        }
    },
};

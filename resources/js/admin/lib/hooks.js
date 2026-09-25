import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { messageOf } from '../api';
import { useToast } from './toast';
import { useConfirm } from './confirm';

export function useDebounce(value, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

export function useList(url, params) {
    return useQuery({
        queryKey: [url, params],
        queryFn: () => api.get(url, { params }).then(r => r.data),
        placeholderData: keepPreviousData,
    });
}

export function useItem(url, enabled = true) {
    return useQuery({ queryKey: [url], queryFn: () => api.get(url).then(r => r.data), enabled, staleTime: url.endsWith('/languages') ? 0 : undefined });
}

export function useDelete(listKey, message) {
    const qc = useQueryClient();
    const toast = useToast();
    const confirm = useConfirm();
    const m = useMutation({
        mutationFn: url => api.delete(url).then(r => r.data),
        onSuccess: d => {
            toast(d.message);
            qc.invalidateQueries({ queryKey: [listKey] });
        },
        onError: e => toast(messageOf(e), 'error'),
    });
    return async (url, msg = message) => (await confirm(msg)) && m.mutate(url);
}

export function useSave({ onSuccess, invalidate = [] }) {
    const qc = useQueryClient();
    const toast = useToast();
    const [errors, setErrors] = useState({});
    const m = useMutation({
        mutationFn: ({ method = 'post', url, data, multipart }) =>
            api.request({
                method: multipart && method !== 'post' ? 'post' : method,
                url,
                data: multipart ? toFormData(data, method) : data,
            }).then(r => r.data),
        onSuccess: d => {
            setErrors({});
            toast(d.message);
            invalidate.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
            onSuccess?.(d);
        },
        onError: e => {
            setErrors(e.response?.data?.errors ?? {});
            toast(messageOf(e), 'error');
        },
    });
    return { save: m.mutate, saving: m.isPending, errors, setErrors };
}

function toFormData(data, method) {
    const fd = new FormData();
    if (method !== 'post') fd.append('_method', method.toUpperCase());
    const put = (k, v) => {
        if (v === null || v === undefined) return;
        if (v instanceof File) fd.append(k, v);
        else if (typeof v === 'boolean') fd.append(k, v ? '1' : '0');
        else if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? Object.entries(x).forEach(([kk, vv]) => put(`${k}[${i}][${kk}]`, vv)) : put(`${k}[${i}]`, x)));
        else fd.append(k, v);
    };
    Object.entries(data).forEach(([k, v]) => put(k, v));
    return fd;
}

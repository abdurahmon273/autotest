import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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

/**
 * Ro'yxat filtrlari va sahifasi URL query'da saqlanadi (?page=4&theme=3...), shuning uchun
 * edit/show'dan qaytganda, F5 bosilganda yoki brauzer "orqaga" tugmasida holat o'sha-o'sha qoladi.
 * `defaults` — kalitlar va bo'sh qiymatlari. Bo'sh qiymat URL'ga yozilmaydi.
 * Qaytaradi: [state, set] — set(key, value) yoki set({key: value, ...}); page bo'lmagan kalit o'zgarsa page 1 bo'ladi.
 * Oxirgi ro'yxat URL'i sessionStorage'da `list:<pathname>` kaliti bilan saqlanadi (useListBack uchun).
 */
export function useListState(defaults) {
    const [sp, setSp] = useSearchParams();
    const { pathname } = useLocation();
    const state = {};
    for (const k of Object.keys(defaults)) {
        const v = sp.get(k);
        state[k] = v === null ? defaults[k] : (typeof defaults[k] === 'number' ? Number(v) || defaults[k] : v);
    }
    useEffect(() => { sessionStorage.setItem(`list:${pathname}`, pathname + (sp.toString() ? `?${sp}` : '')); }, [pathname, sp]);
    const set = useCallback((key, value) => {
        const patch = typeof key === 'object' ? key : { [key]: value };
        if (!('page' in patch) && 'page' in defaults) patch.page = defaults.page;
        setSp(prev => {
            const next = new URLSearchParams(prev);
            for (const [k, v] of Object.entries(patch)) {
                if (v === '' || v === null || v === undefined || v === defaults[k]) next.delete(k); else next.set(k, String(v));
            }
            return next;
        }, { replace: true });
    }, [setSp, defaults]);
    return [state, set];
}

/** Ro'yxatga qaytish manzili: oxirgi saqlangan filtr/sahifa bilan, bo'lmasa `fallback`. */
export function listBack(fallback) {
    return sessionStorage.getItem(`list:${fallback}`) ?? fallback;
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
            qc.invalidateQueries({ queryKey: Array.isArray(listKey) ? listKey : [listKey] });
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
            invalidate.forEach(k => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
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

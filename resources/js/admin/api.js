import axios from 'axios';

const api = axios.create({
    baseURL: '/api/admin',
    withCredentials: true,
    withXSRFToken: true,
    headers: { Accept: 'application/json' },
});

let csrfReady = null;
api.interceptors.request.use(async config => {
    if (config.method !== 'get') {
        csrfReady ??= axios.get('/sanctum/csrf-cookie', { withCredentials: true });
        await csrfReady;
    }
    return config;
});

api.interceptors.response.use(
    r => r,
    err => {
        if (err.response?.status === 401 && !location.pathname.endsWith('/admin/login')) {
            location.href = '/admin/login';
        }
        return Promise.reject(err);
    },
);

export const errorsOf = err => err.response?.data?.errors ?? {};
export const messageOf = err => err.response?.data?.message ?? 'Xatolik yuz berdi.';

export default api;

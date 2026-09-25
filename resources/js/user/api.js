import axios from 'axios';

const api = axios.create({ baseURL: '/api/user', withCredentials: true, withXSRFToken: true, headers: { Accept: 'application/json' } });

let csrf = null;
api.interceptors.request.use(async c => {
    if (c.method !== 'get') await (csrf ??= axios.get('/sanctum/csrf-cookie', { withCredentials: true }));
    return c;
});
api.interceptors.response.use(r => r, e => {
    if (e.response?.status === 401) location.href = '/login';
    return Promise.reject(e);
});

export const logout = async () => {
    await (csrf ??= axios.get('/sanctum/csrf-cookie', { withCredentials: true }));
    await axios.post('/logout', {}, { withCredentials: true, withXSRFToken: true });
    location.href = '/';
};

export default api;

import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => api.get('/me').then(r => r.data),
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const value = {
        user: data?.user ?? null,
        roles: data?.roles ?? [],
        can: p => !!data?.permissions?.includes(p),
        loading: isLoading,
        setMe: me => qc.setQueryData(['me'], me),
        logout: async () => {
            await api.post('/logout');
            qc.clear();
            location.href = '/admin/login';
        },
    };

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

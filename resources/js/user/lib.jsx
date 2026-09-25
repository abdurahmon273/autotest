import { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from './api';

const Ctx = createContext(null);

export function LangProvider({ children }) {
    const { data: langs } = useQuery({ queryKey: ['languages'], queryFn: () => api.get('/languages').then(r => r.data), staleTime: 5 * 60_000 });
    const [picked, setPicked] = useState(() => localStorage.getItem('lang'));
    const list = langs ?? [];
    const key = list.some(l => l.key === picked) ? picked : list.find(l => l.default)?.key ?? list[0]?.key ?? 'krill';
    const set = k => { localStorage.setItem('lang', k); setPicked(k); };
    return <Ctx.Provider value={{ langs: list, key, set, ready: !!langs }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

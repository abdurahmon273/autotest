import { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

const Ctx = createContext(null);

/** Til: serverda user ustunida saqlanadi (users.lang). Birinchi kirishda birlamchi til yoziladi. */
export function LangProvider({ children }) {
    const qc = useQueryClient();
    const { data } = useQuery({ queryKey: ['languages'], queryFn: () => api.get('/languages').then(r => r.data), staleTime: 5 * 60_000 });
    const [override, setOverride] = useState(null); // optimistik tanlov, server javobini kutmasdan
    const list = data?.list ?? [];
    const key = override && list.some(l => l.key === override) ? override : data?.current ?? list.find(l => l.default)?.key ?? list[0]?.key ?? 'krill';
    const set = k => {
        if (k === key) return;
        setOverride(k);
        api.put('/lang', { lang: k }).then(() => qc.setQueryData(['languages'], d => (d ? { ...d, current: k } : d))).catch(() => setOverride(null));
    };
    return <Ctx.Provider value={{ langs: list, key, set, ready: !!data, multi: list.length > 1 }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../api';
import { useDebounce } from '../lib/hooks';
import ThemeLabel from './ThemeLabel';

export default function ThemeSelect({ value, onChange }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const q = useDebounce(search, 250);
    const box = useRef(null);
    const input = useRef(null);
    const ids = value.map(t => t.id);

    const { data, isFetching } = useQuery({
        queryKey: ['themes/search', q, ids],
        queryFn: () => api.get('/themes/search', { params: { search: q, exclude: ids } }).then(r => r.data),
        enabled: open,
        placeholderData: p => p,
    });

    useEffect(() => {
        const h = e => !box.current?.contains(e.target) && setOpen(false);
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    return (
        <div className="relative" ref={box}>
            <div className="form-input flex flex-wrap items-center gap-1.5 cursor-text text-base py-2" onClick={() => { input.current.focus(); setOpen(true); }}>
                {value.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 px-2 py-1 text-[15px] font-medium">
                        <ThemeLabel theme={t} />
                        <button type="button" onClick={e => { e.stopPropagation(); onChange(value.filter(x => x.id !== t.id)); }} className="text-blue-400 hover:text-blue-700"><X className="w-3.5 h-3.5" /></button>
                    </span>
                ))}
                <input ref={input} value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setOpen(true)} placeholder={value.length ? '' : 'Mavzu qidiring...'}
                    className="flex-1 min-w-24 bg-transparent border-0 p-0 text-base focus:ring-0 focus:outline-none placeholder-gray-400" />
            </div>
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {isFetching && !data ? <div className="p-3 space-y-2 animate-pulse">{[0, 1, 2, 3].map(i => <div key={i} className="h-3.5 rounded bg-gray-200 w-2/3" />)}</div>
                        : <div className="max-h-72 overflow-y-auto">
                            {data?.length ? data.map(t => (
                                <button key={t.id} type="button" onClick={() => { onChange([...value, t]); setSearch(''); }} className="w-full px-3 py-2.5 text-base text-left text-gray-800 hover:bg-gray-50"><ThemeLabel theme={t} /></button>
                            )) : <p className="px-3 py-2 text-sm text-gray-400">Topilmadi</p>}
                        </div>}
                </div>
            )}
        </div>
    );
}

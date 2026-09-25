import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import api, { messageOf } from '../api';
import { useDebounce } from '../lib/hooks';
import { useToast } from '../lib/toast';
import Drawer from './Drawer';
import { SearchInput } from './ui';
import { fmtPhone } from '../lib/utils';

export default function StudentPicker({ open, onClose, groupId, exclude = [], onAdded }) {
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState([]);
    const q = useDebounce(search, 250);
    const toast = useToast();
    const qc = useQueryClient();
    const sentinel = useRef(null);

    useEffect(() => { if (open) { setSearch(''); setPicked([]); } }, [open]);

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['students/search', groupId, exclude, q],
        queryFn: ({ pageParam = 1 }) => api.get('/students/search', { params: { search: q, group_id: groupId, exclude, page: pageParam } }).then(r => r.data),
        getNextPageParam: p => (p.current_page < p.last_page ? p.current_page + 1 : undefined),
        enabled: open,
    });

    useEffect(() => {
        if (!open || !sentinel.current) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage());
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, data]);

    const add = useMutation({
        mutationFn: () => (groupId ? api.post(`/groups/${groupId}/students`, { ids: picked }).then(r => r.data) : Promise.resolve({ message: `${picked.length} ta student qo‘shildi.` })),
        onSuccess: d => {
            toast(d.message);
            qc.invalidateQueries({ queryKey: ['students/search'] });
            onAdded(picked.map(Number));
            onClose();
        },
        onError: e => toast(messageOf(e), 'error'),
    });

    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const toggle = id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

    return (
        <Drawer open={open} onClose={onClose} title="Student qo‘shish" footer={
            <>
                <button type="button" className="btn-secondary" onClick={onClose}>Bekor qilish</button>
                <button type="button" className="btn-primary" disabled={!picked.length || add.isPending} onClick={() => add.mutate()}>
                    {add.isPending && <LoaderCircle className="w-4 h-4 animate-spin" />} Qo‘shish {picked.length > 0 && `(${picked.length})`}
                </button>
            </>
        }>
            <div className="p-5 border-b border-gray-200"><SearchInput value={search} onChange={setSearch} placeholder="Ism, username, telefon yoki Telegram ID..." className="w-full" /></div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse"><div className="h-4 w-4 rounded bg-gray-200" /><div className="flex-1 space-y-1.5"><div className="h-3.5 w-2/3 rounded bg-gray-200" /><div className="h-3 w-1/3 rounded bg-gray-200" /></div></div>
                )) : rows.length ? rows.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 rounded border-gray-300 text-admin-primary focus:ring-admin-primary" />
                        <span className="min-w-0"><span className="block text-gray-800 truncate">{s.name}</span><span className="block text-xs text-gray-400">{fmtPhone(s.phone)}{s.username && ` · ${s.username}`}</span></span>
                    </label>
                )) : <p className="px-5 py-10 text-center text-sm text-gray-400">Topilmadi</p>}
                {hasNextPage && <div ref={sentinel} className="px-5 py-3 space-y-2 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-3.5 rounded bg-gray-200 w-2/3 mx-auto" />)}</div>}
            </div>
        </Drawer>
    );
}

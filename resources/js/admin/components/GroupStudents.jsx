import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import api, { messageOf } from '../api';
import { useDebounce } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { useConfirm } from '../lib/confirm';
import StudentPicker from './StudentPicker';
import { Empty, SearchInput, SkeletonRows, Td, Th, THead } from './ui';
import { fmtPhone } from '../lib/utils';

export default function GroupStudents({ groupId, selected, onChange }) {
    const [filter, setFilter] = useState('');
    const [open, setOpen] = useState(false);
    const q = useDebounce(filter, 300);
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const sentinel = useRef(null);

    const server = useInfiniteQuery({
        queryKey: ['groups', groupId, 'students', q],
        queryFn: ({ pageParam = 1 }) => api.get(`/groups/${groupId}/students`, { params: { search: q, page: pageParam } }).then(r => r.data),
        getNextPageParam: p => (p.current_page < p.last_page ? p.current_page + 1 : undefined),
        enabled: !!groupId,
    });

    const local = useQuery({
        queryKey: ['students/pick', selected],
        queryFn: () => (selected.length ? api.get('/students/pick', { params: { ids: selected } }).then(r => r.data) : []),
        enabled: !groupId,
    });

    useEffect(() => {
        if (!groupId || !sentinel.current) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && server.hasNextPage && !server.isFetchingNextPage && server.fetchNextPage());
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [groupId, server.hasNextPage, server.isFetchingNextPage, server.data]);

    const remove = useMutation({
        mutationFn: id => api.delete(`/groups/${groupId}/students/${id}`).then(r => r.data),
        onSuccess: d => { toast(d.message); qc.invalidateQueries({ queryKey: ['groups'] }); },
        onError: e => toast(messageOf(e), 'error'),
    });

    const rows = groupId
        ? server.data?.pages.flatMap(p => p.data) ?? []
        : (local.data ?? []).filter(s => !q || [s.name, s.username, s.phone, s.chat_id].some(v => v?.toLowerCase().includes(q.toLowerCase())));
    const total = groupId ? server.data?.pages[0]?.total ?? 0 : selected.length;
    const loading = groupId ? server.isLoading : local.isLoading;

    const onRemove = async s => {
        if (!(await confirm(`${s.name} guruhdan chiqarilsinmi?`))) return;
        if (groupId) remove.mutate(s.id);
        else onChange(selected.filter(id => id !== s.id));
    };

    return (
        <div className="card">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">Studentlar <span className="text-gray-400 font-normal">({total})</span></h3>
                <div className="flex items-center gap-2">
                    <SearchInput value={filter} onChange={setFilter} className="w-48 py-1.5" />
                    <button type="button" className="btn-primary" onClick={() => setOpen(true)}><UserPlus className="w-4 h-4" /> Student qo‘shish</button>
                </div>
            </div>
            <table className="min-w-full">
                <THead><Th className="w-12">#</Th><Th>To‘liq ism</Th><Th>Telefon</Th><Th>Username</Th><Th>Telegram ID</Th><Th className="text-right">Amallar</Th></THead>
                <tbody className="table-body">
                    {loading ? <SkeletonRows cols={6} rows={4} /> : rows.length ? rows.map((s, i) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                            <Td className="text-gray-400">{i + 1}</Td>
                            <Td className="font-medium text-gray-900">{s.name}</Td>
                            <Td>{fmtPhone(s.phone)}</Td>
                            <Td className="text-gray-500">{s.username ?? '—'}</Td>
                            <Td className="text-gray-500">{s.chat_id ?? '—'}</Td>
                            <Td><div className="flex justify-end"><button type="button" onClick={() => onRemove(s)} className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">Chiqarish</button></div></Td>
                        </tr>
                    )) : <Empty colSpan={6} text={q ? 'Topilmadi' : 'Studentlar qo‘shilmagan'} />}
                </tbody>
            </table>
            {groupId && server.hasNextPage && <div ref={sentinel} className="px-5 py-3 border-t border-gray-200 space-y-2 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-3.5 rounded bg-gray-200 w-1/2 mx-auto" />)}</div>}

            <StudentPicker open={open} onClose={() => setOpen(false)} groupId={groupId} exclude={groupId ? [] : selected}
                onAdded={ids => { if (groupId) qc.invalidateQueries({ queryKey: ['groups'] }); else onChange([...new Set([...selected, ...ids])]); }} />
        </div>
    );
}

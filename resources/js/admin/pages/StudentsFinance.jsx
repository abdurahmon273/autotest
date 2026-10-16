import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Check, LoaderCircle, SquarePen, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../lib/auth';
import { useDebounce, useItem } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { Avatar, Badge, Empty, GroupChips, Input, PageHeader, SearchInput, SkeletonRows, Th, THead, Td } from '../components/ui';
import { cx, fmtPhone } from '../lib/utils';

const fmtSum = n => Number(n).toLocaleString('ru-RU');
const digits = v => v.replace(/\D/g, '').slice(0, 12);

/** Bitta qator: to'lov ko'rinishi va joyida tahrirlash (radio: ko'rsatilmasin / summa). */
function PaymentCell({ student, canEdit, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [withSum, setWithSum] = useState(student.payment !== null);
    const [sum, setSum] = useState(student.payment ?? '');
    const [saving, setSaving] = useState(false);
    const toast = useToast();
    const input = useRef(null);

    useEffect(() => { if (editing && withSum) input.current?.focus(); }, [editing, withSum]);

    const start = () => { setWithSum(student.payment !== null); setSum(student.payment ?? ''); setEditing(true); };
    const save = async () => {
        setSaving(true);
        try {
            const { data } = await api.put(`/students/${student.id}/payment`, { payment: withSum ? (sum === '' ? 0 : Number(sum)) : null });
            onSaved(student.id, data.payment);
            setEditing(false);
        } catch (e) {
            toast(e.response?.data?.errors?.payment?.[0] ?? e.response?.data?.message ?? 'Xatolik', 'error');
        } finally { setSaving(false); }
    };

    if (!editing) {
        return (
            <div className="flex items-center gap-3">
                {student.payment === null
                    ? <span className="text-gray-300">—</span>
                    : <Badge color={student.payment > 0 ? 'green' : 'red'} className="!text-base !px-3 !py-1 tabular-nums">{fmtSum(student.payment)} so‘m</Badge>}
                {canEdit && <button type="button" onClick={start} className="icon-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Tahrirlash"><SquarePen className="w-4 h-4" /></button>}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" checked={!withSum} onChange={() => setWithSum(false)} className="h-4 w-4 border-gray-300 text-admin-primary" /> Ko‘rsatilmasin</label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" checked={withSum} onChange={() => setWithSum(true)} className="h-4 w-4 border-gray-300 text-admin-primary" /> Summa</label>
            {withSum && <input ref={input} value={sum} onChange={e => setSum(digits(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} placeholder="500000" inputMode="numeric" className="form-input w-36 tabular-nums" />}
            <button type="button" onClick={save} disabled={saving} className="icon-btn text-green-600 hover:bg-green-50" title="Saqlash">{saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Bekor"><X className="w-4 h-4" /></button>
        </div>
    );
}

export default function StudentsFinance() {
    const { can } = useAuth();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [groupId, setGroupId] = useState('');
    const [range, setRange] = useState({ from: '', to: '' });
    const q = useDebounce(search);
    const from = useDebounce(range.from, 400);
    const to = useDebounce(range.to, 400);
    const sentinel = useRef(null);
    const params = { search: q, status, group_id: groupId, from, to };
    const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['/students/finance', params],
        queryFn: ({ pageParam = 1 }) => api.get('/students/finance', { params: { ...params, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
    });
    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;
    const { data: groups } = useItem('/students/groups');

    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    const onSaved = (id, payment) => {
        qc.setQueryData(['/students/finance', params], d => d ? { ...d, pages: d.pages.map(p => ({ ...p, data: p.data.map(s => s.id === id ? { ...s, payment } : s) })) } : d);
    };

    return (
        <>
            <PageHeader title="O‘quvchilar moliyasi" />

            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Ism, username yoki telefon..." className="w-64" />
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-input !w-40 shrink-0">
                    <option value="">To‘lov: barchasi</option>
                    <option value="paid">To‘lagan</option>
                    <option value="unpaid">To‘lamagan</option>
                </select>
                <div className="flex items-center gap-2">
                    <Input value={range.from} onChange={e => setRange(r => ({ ...r, from: digits(e.target.value) }))} placeholder="dan" inputMode="numeric" className="w-32 tabular-nums" />
                    <span className="text-gray-400">—</span>
                    <Input value={range.to} onChange={e => setRange(r => ({ ...r, to: digits(e.target.value) }))} placeholder="gacha" inputMode="numeric" className="w-32 tabular-nums" />
                </div>
                <select value={groupId} onChange={e => setGroupId(e.target.value)} className="form-input !w-48 shrink-0">
                    <option value="">Barcha guruhlar</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <span className="ml-auto text-sm text-gray-500">{isFetching && !isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin inline" /> : `${total} ta o‘quvchi`}</span>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <THead><Th>O‘quvchi</Th><Th>Guruh</Th><Th>To‘lov</Th></THead>
                        <tbody className="table-body">
                            {isLoading ? <SkeletonRows cols={3} /> : rows.length ? rows.map(s => (
                                <tr key={s.id} className={cx(s.payment !== null && (s.payment > 0 ? 'bg-green-50/40' : 'bg-red-50/40'))}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={s.name} />
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{s.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{s.username && `@${s.username}`}{s.username && s.phone && ' · '}{s.phone && fmtPhone(s.phone)}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td><GroupChips groups={s.groups} empty="Guruhsiz" /></Td>
                                    <Td><PaymentCell student={s} canEdit={can('update_student')} onSaved={onSaved} /></Td>
                                </tr>
                            )) : <Empty colSpan={3} text="O‘quvchilar topilmadi" />}
                        </tbody>
                    </table>
                </div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400">{isFetchingNextPage && <LoaderCircle className="w-4 h-4 animate-spin" />}</div>
            </div>
        </>
    );
}

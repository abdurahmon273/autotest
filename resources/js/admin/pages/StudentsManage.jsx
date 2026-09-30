import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api';
import { Link } from 'react-router-dom';
import { Ban, LoaderCircle, Save, ShieldCheck, SquarePen, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useItem, useSave } from '../lib/hooks';
import { Avatar, Badge, Empty, Field, GroupChips, Input, PageHeader, SearchInput, SkeletonRows, Th, THead, Td } from '../components/ui';
import { cx, fmtDate, fmtPhone } from '../lib/utils';

const isBlocked = s => Number(s.max_attempts) <= 0;

/** Chap-o'ng suriladigan toggle. */
function Switch({ checked, onChange, id }) {
    return (
        <button type="button" role="switch" aria-checked={checked} id={id} onClick={() => onChange(!checked)}
            className={cx('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-red-300', checked ? 'bg-red-500' : 'bg-gray-200')}>
            <span className={cx('inline-block h-6 w-6 rounded-full bg-white shadow transform transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
        </button>
    );
}

function AttemptsModal({ student, onClose, onSaved }) {
    const [attempts, setAttempts] = useState(Number(student.max_attempts) > 0 ? String(student.max_attempts) : '');
    const [blocked, setBlocked] = useState(isBlocked(student));
    const { save, saving, errors } = useSave({ onSuccess: () => { onSaved(); onClose(); }, invalidate: ['/students/manage', '/students'] });

    useEffect(() => {
        const h = e => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const setNum = e => {
        const raw = e.target.value;
        if (raw === '') return setAttempts('');
        if (raw.startsWith('-')) return setAttempts('');
        if (!/^\d+$/.test(raw) || Number(raw) > 1000) return;
        setAttempts(String(Number(raw)));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: `/students/${student.id}/attempts`, data: { max_attempts: attempts === '' ? 0 : Number(attempts), blocked } }); }} noValidate
                className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-pop overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
                    <Avatar name={student.name} size="w-12 h-12 text-lg" />
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-gray-900 truncate">{student.name}</p>
                        <p className="text-sm text-gray-500 truncate">{student.username ? `@${student.username}` : ''}{student.username && student.phone ? ' · ' : ''}{student.phone ? fmtPhone(student.phone) : ''}{!student.username && !student.phone && '—'}</p>
                        <div className="mt-1.5"><GroupChips groups={student.groups} empty="Guruhsiz" /></div>
                    </div>
                    <button type="button" onClick={onClose} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    <Field label="Imkoniyatlar soni" error={errors.max_attempts}>
                        <Input type="text" inputMode="numeric" value={attempts} onChange={setNum} disabled={blocked} className={cx(blocked && 'opacity-50')} />
                    </Field>

                    <label htmlFor="block-switch" className={cx('flex items-center justify-between gap-4 rounded-xl border px-4 py-3 cursor-pointer transition-colors', blocked ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50')}>
                        <span className="flex items-center gap-3">
                            <span className={cx('h-9 w-9 rounded-lg flex items-center justify-center', blocked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500')}><Ban className="w-4 h-4" /></span>
                            <span>
                                <span className={cx('block text-sm font-semibold', blocked ? 'text-red-700' : 'text-gray-900')}>O‘quvchini bloklash</span>
                                <span className="block text-xs text-gray-500">Saqlansa imkoniyatlar soni 0 bo‘ladi</span>
                            </span>
                        </span>
                        <Switch id="block-switch" checked={blocked} onChange={setBlocked} />
                    </label>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Bekor qilish</button>
                    <button type="submit" disabled={saving} className={cx(blocked ? 'inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors' : 'btn-primary')}>
                        {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : blocked ? <Ban className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {blocked ? 'Bloklash' : 'Saqlash'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function StudentsManage() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [groupId, setGroupId] = useState('');
    const [editing, setEditing] = useState(null);
    const q = useDebounce(search);
    const sentinel = useRef(null);
    const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['/students/manage', { search: q, status, group_id: groupId }],
        queryFn: ({ pageParam = 1 }) => api.get('/students/manage', { params: { search: q, status, group_id: groupId, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
    });
    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;
    const { data: groups } = useItem('/students/groups');
    const reset = fn => v => fn(v);

    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    return (
        <>
            <PageHeader title="O‘quvchilar boshqaruvi" />

            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={reset(setSearch)} placeholder="Ism, username yoki telefon..." className="w-72" />
                <select value={status} onChange={e => reset(setStatus)(e.target.value)} className="form-input !w-44 shrink-0">
                    <option value="">Barcha holatlar</option>
                    <option value="active">Faol</option>
                    <option value="blocked">Bloklangan</option>
                </select>
                <select value={groupId} onChange={e => reset(setGroupId)(e.target.value)} className="form-input !w-52 shrink-0">
                    <option value="">Barcha guruhlar</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <span className="ml-auto text-sm text-gray-500">{isFetching && !isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin inline" /> : `${total} ta o‘quvchi`}</span>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <THead><Th>O‘quvchi</Th><Th>Guruh</Th><Th>Blok holat</Th><Th className="text-center">Imkoniyatlar</Th><Th className="text-center">Natijalar</Th><Th>Ro‘yxatdan o‘tgan</Th><Th className="text-right">Amallar</Th></THead>
                        <tbody className="table-body">
                            {isLoading ? <SkeletonRows cols={7} /> : rows.length ? rows.map(s => {
                    const blocked = isBlocked(s);
                    return (
                        <tr key={s.id}>
                            <Td>
                                <div className="flex items-center gap-3">
                                    <Avatar name={s.name} />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{can('show_student') ? <Link to={`/admin/students/${s.id}`} className="hover:text-blue-600">{s.name}</Link> : s.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{s.username ? `@${s.username}` : ''}{s.username && s.phone ? ' · ' : ''}{s.phone ? fmtPhone(s.phone) : ''}</p>
                                    </div>
                                </div>
                            </Td>
                            <Td><GroupChips groups={s.groups} /></Td>
                            <Td>{blocked ? <Badge color="red"><Ban className="w-3 h-3 mr-1" /> Bloklangan</Badge> : <Badge color="green"><ShieldCheck className="w-3 h-3 mr-1" /> Faol</Badge>}</Td>
                            <Td className="text-center"><span className={cx('inline-flex min-w-8 justify-center rounded-md px-2 py-0.5 text-sm font-semibold', blocked ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-800')}>{s.max_attempts}</span></Td>
                            <Td className="text-center font-medium text-gray-800">{s.homeworks_count}</Td>
                            <Td className="text-gray-500 whitespace-nowrap">{fmtDate(s.created_at)}</Td>
                            <Td>
                                <div className="flex items-center justify-end">
                                    {can('update_student') && <button type="button" onClick={() => setEditing(s)} className="icon-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Imkoniyatlar / bloklash"><SquarePen className="w-4 h-4" /></button>}
                                </div>
                            </Td>
                        </tr>
                    );
                            }) : <Empty colSpan={7} text="O‘quvchilar topilmadi" />}
                        </tbody>
                    </table>
                </div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">
                    {isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : !hasNextPage && rows.length > 15 ? 'Hammasi yuklandi' : ''}
                </div>
            </div>

            {editing && <AttemptsModal student={editing} onClose={() => setEditing(null)} onSaved={() => {}} />}
        </>
    );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronRight, ClipboardList, Download, Layers, RefreshCw, LoaderCircle, Plus, Search, Send, SquarePen, Users, X } from 'lucide-react';
import api, { messageOf } from '../api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useSave } from '../lib/hooks';
import { Actions, Avatar, Badge, Empty, Field, Input, PageHeader, SaveButton, SearchInput, SkeletonBlock, Td, Th, THead } from '../components/ui';
import DateTimePicker from '../components/DateTimePicker';
import ThemeLabel from '../components/ThemeLabel';
import { cx, fmtDate, fmtPhone } from '../lib/utils';

const STATUS = { 1: ['Faol', 'green'], 0: ['Tugallangan', 'gray'] };
export const StatusBadge = ({ status }) => { const [label, color] = STATUS[status] ?? ['—', 'gray']; return <Badge color={color}>{label}</Badge>; };
const themeTitle = t => t?.title ?? t?.title_krill ?? '—';

/* ---------- 1. Guruhlar (cardlar) ---------- */
export function HomeworkGroups() {
    const { data } = useItem('/tasks/groups');

    return (
        <>
            <PageHeader title="Uyga vazifalar" />
            {!data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 h-32 animate-pulse" />)}</div>
            ) : data.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map(g => (
                        <Link key={g.id} to={`/admin/homeworks/${g.id}`} className="card p-5 flex flex-col gap-3 hover:border-admin-primary hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">{g.name}</h3>
                                    {g.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{g.description}</p>}
                                </div>
                                <span className="h-9 w-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Layers className="w-4 h-4" /></span>
                            </div>
                            <div className="mt-auto flex items-center justify-between text-sm">
                                <div className="flex items-center gap-4 text-gray-500">
                                    <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" />{g.students_count ? `${g.students_count} student` : 'Student yo‘q'}</span>
                                    <span className="inline-flex items-center gap-1.5"><ClipboardList className="w-4 h-4" />{g.tasks_count} vazifa</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-admin-primary transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : <div className="card p-12 text-center text-sm text-gray-400">Guruhlar yo‘q</div>}
        </>
    );
}

/* ---------- Guruh sarlavhasi ---------- */
function GroupHeader({ group, groupId, right }) {
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to="/admin/homeworks" className="text-gray-400 hover:text-gray-700 transition-colors" title="Orqaga"><ArrowLeft className="w-6 h-6" /></Link>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{group ? group.name : <SkeletonBlock className="h-7 w-48" />}</h1>
                </div>
                {right}
            </div>
            <div className="card mb-5 overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <span className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm"><Layers className="w-7 h-7" /></span>
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Guruh nomi</p>
                            <p className="text-xl font-bold text-gray-900 truncate">{group?.name ?? '…'}</p>
                            <p className="mt-1 text-sm text-gray-500">{group ? (group.description || 'Tavsif yo‘q') : '…'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:w-[26rem] shrink-0">
                        <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
                            <p className="text-xs font-medium text-sky-700 flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Telegram guruh ID</p>
                            <p className="mt-1 text-base font-semibold text-sky-900 truncate">{group ? (group.telegram_chat_id ?? '—') : '…'}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Studentlar soni</p>
                            <p className="mt-1 text-2xl font-extrabold leading-none text-emerald-800">{group ? group.students_count : '…'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ---------- 2. Guruh ichi: vazifalar ro'yxati (infinite scroll) ---------- */
export function HomeworkGroupShow() {
    const { groupId } = useParams();
    const { can } = useAuth();
    const { data: group } = useItem(`/tasks/groups/${groupId}`);
    const del = useDelete(['/tasks', groupId]);
    const sentinel = useRef(null);
    const qc = useQueryClient();
    const toast = useToast();
    const [sending, setSending] = useState(null);
    const sendTelegram = async t => {
        setSending(t.id);
        try {
            const { data: r } = await api.post(`/tasks/${t.id}/telegram`);
            toast(r.message);
            if (r.status !== t.status) { qc.invalidateQueries({ queryKey: ['/tasks', groupId] }); qc.invalidateQueries({ queryKey: [`/tasks/${t.id}`] }); }
        } catch (e) { toast(messageOf(e), 'error'); } finally { setSending(null); }
    };

    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['/tasks', groupId],
        queryFn: ({ pageParam = 1 }) => api.get('/tasks', { params: { group_id: groupId, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
    });
    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;

    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    return (
        <>
            <GroupHeader group={group} groupId={groupId} />
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Uyga vazifalar <span className="ml-1 text-xs font-normal text-gray-400">{total} ta</span></h3>
                    {can('create_task') && <Link to={`/admin/homeworks/${groupId}/create`} className="btn-primary"><Plus className="w-4 h-4" /> Vazifa qo‘shish</Link>}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <THead>
                            <Th className="w-12">#</Th><Th>Nomi</Th><Th>Holat</Th><Th>Bo‘lim</Th><Th>Min. testlar</Th><Th>Min. foiz</Th><Th>Natijalar</Th><Th>Boshlanish vaqti</Th><Th>Tugash vaqti</Th><Th className="text-right">Amallar</Th>
                        </THead>
                        <tbody className="table-body">
                            {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse">{Array.from({ length: 10 }).map((_, j) => <td key={j} className="table-td"><div className="h-3.5 rounded bg-gray-200 w-3/4" /></td>)}</tr>)
                                : rows.length ? rows.map(t => (
                                    <tr key={t.id}>
                                        <Td className="text-gray-400">{t.id}</Td>
                                        <Td className="font-medium text-gray-900">{can('show_task') ? <Link to={`/admin/homeworks/${groupId}/${t.id}`} className="hover:text-blue-600">{t.title}</Link> : t.title}</Td>
                                        <Td><StatusBadge status={t.status} /></Td>
                                        <Td className="text-gray-600">{themeTitle(t.theme)}</Td>
                                        <Td className="font-medium text-gray-900">{t.min_test_count}</Td>
                                        <Td className="font-medium text-gray-900">{t.passing_percentage}%</Td>
                                        <Td>{t.homeworks_count}</Td>
                                        <Td className="text-gray-500 whitespace-nowrap">{fmtDate(t.start_date)}</Td>
                                        <Td className="text-gray-500 whitespace-nowrap">{fmtDate(t.end_date)}</Td>
                                        <Td><div className="flex items-center justify-end gap-1">
                                            {can('show_task') && <button type="button" onClick={() => sendTelegram(t)} disabled={sending === t.id} title="Natijalarni Telegramga yuborish" className="icon-btn text-sky-500 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-60">{sending === t.id ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>}
                                            <Actions show={can('show_task') && `/admin/homeworks/${groupId}/${t.id}`} edit={can('update_task') && `/admin/homeworks/${groupId}/${t.id}/edit`}
                                                onDelete={can('delete_task') && (() => del(`/tasks/${t.id}`, `«${t.title}» o‘chirilsinmi?`))} />
                                        </div></Td>
                                    </tr>
                                )) : <Empty colSpan={10} text="Vazifalar yo‘q" />}
                        </tbody>
                    </table>
                </div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400">
                    {isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : hasNextPage ? '' : rows.length > 10 ? 'Hammasi yuklandi' : ''}
                </div>
            </div>
        </>
    );
}

/* ---------- Bitta bo'lim tanlash (qidiruv) ---------- */
function ThemePick({ value, onChange, error }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const q = useDebounce(search, 200);
    const box = useRef(null);
    const input = useRef(null);
    const { data, isFetching } = useQuery({ queryKey: ['/tasks/themes', q], queryFn: () => api.get('/tasks/themes', { params: { search: q } }).then(r => r.data), enabled: open, placeholderData: p => p, staleTime: 60_000 });

    useEffect(() => {
        const h = e => { if (!box.current?.contains(e.target)) { setOpen(false); setSearch(''); } };
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    const start = () => { setOpen(true); setTimeout(() => input.current?.focus(), 0); };
    const choose = t => { onChange(t); setSearch(''); setOpen(false); };

    return (
        <div className="relative" ref={box}>
            {open || !value ? (
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input ref={input} value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (data?.length === 1) choose(data[0]); } }} placeholder={value ? `${themeTitle(value)} — boshqasini qidiring...` : 'Bo‘lim qidiring...'} className={cx('form-input pl-9 pr-9', error && 'border-red-300')} />
                    {value && <button type="button" onClick={() => choose(null)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" title="Tozalash"><X className="w-4 h-4" /></button>}
                </div>
            ) : (
                <div onClick={start} className={cx('form-input flex items-center justify-between gap-2 cursor-pointer hover:border-gray-300', error && 'border-red-300')}>
                    <span className="flex items-center gap-2 min-w-0"><ThemeLabel theme={value} /><span className="text-xs text-gray-400 shrink-0">({value.questions_count ?? 0})</span></span>
                    <button type="button" onClick={e => { e.stopPropagation(); choose(null); }} className="text-gray-400 hover:text-gray-700" title="Tozalash"><X className="w-4 h-4" /></button>
                </div>
            )}
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {isFetching && !data ? <div className="p-3 space-y-2 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-3.5 rounded bg-gray-200 w-2/3" />)}</div>
                        : <div className="max-h-64 overflow-y-auto">
                            {data?.length ? data.map(t => <button key={t.id} type="button" onClick={() => choose(t)} className={cx('w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between gap-2', value?.id === t.id ? 'bg-blue-50 text-blue-700' : 'text-gray-800')}><ThemeLabel theme={t} /><span className="text-xs text-gray-400 shrink-0">({t.questions_count ?? 0})</span></button>)
                                : <p className="px-3 py-2 text-sm text-gray-400">Topilmadi</p>}
                        </div>}
                </div>
            )}
        </div>
    );
}

/* ---------- 3. Forma (yaratish / tahrirlash) ---------- */
export function HomeworkForm() {
    const { groupId, id } = useParams();
    const nav = useNavigate();
    const { data: group } = useItem(`/tasks/groups/${groupId}`);
    const { data: task } = useItem(`/tasks/${id}`, !!id);
    const [form, setForm] = useState(null);
    const auto = useRef(true); // title hali qo'lda o'zgartirilmagan
    const listPath = `/admin/homeworks/${groupId}`;
    const { save, saving, errors } = useSave({ onSuccess: () => nav(listPath), invalidate: [['/tasks', groupId], `/tasks/${id}`, `/tasks/${id}/homeworks`, `/tasks/groups/${groupId}`, '/tasks/groups'] });

    if (id && !task) return null;
    const f = form ?? {
        theme: task?.theme ?? null,
        title: task?.title ?? '',
        description: task?.description ?? '',
        min_test_count: task?.min_test_count ?? '',
        passing_percentage: task?.passing_percentage ?? '',
        start_date: task?.start_date ?? '',
        end_date: task?.end_date ?? '',
        status: task?.status ?? 1,
    };
    if (id && form === null) auto.current = false;
    const set = (k, v) => setForm(p => ({ ...(p ?? f), [k]: v }));
    // auto.current = title hozir mavzudan avtomatik olingan (qo'lda o'zgartirilmagan)
    const pickTheme = t => {
        let title = f.title;
        if (!t) { if (auto.current) { title = ''; auto.current = false; } }
        else if (auto.current || !f.title.trim()) { title = themeTitle(t); auto.current = true; }
        setForm({ ...f, theme: t, title });
    };
    const setTitle = v => { auto.current = false; set('title', v); };
    // Sonli maydonlar: manfiy -> 0, max dan oshsa eski qiymat qoladi
    const setNum = (k, max) => e => {
        const raw = e.target.value;
        if (raw === '') return set(k, '');
        if (raw.startsWith('-')) return set(k, 0);
        if (!/^\d+$/.test(raw)) return;
        const n = Number(raw);
        if (n > max) return;
        set(k, n);
    };

    const submit = e => {
        e.preventDefault();
        const { theme, ...rest } = f;
        save({ method: id ? 'put' : 'post', url: id ? `/tasks/${id}` : '/tasks', data: { ...rest, theme_id: theme?.id ?? null, group_id: Number(groupId) } });
    };

    return (
        <form onSubmit={submit} noValidate>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to={id ? `${listPath}/${id}` : listPath} className="text-gray-400 hover:text-gray-700 transition-colors" title="Orqaga"><ArrowLeft className="w-6 h-6" /></Link>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{id ? 'Uyga vazifani tahrirlash' : 'Yangi uyga vazifa yaratish'}</h1>
                </div>
                <SaveButton saving={saving} />
            </div>
            <div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
                <Layers className="w-4 h-4" /> Guruh: <span className="font-semibold text-gray-900">{group?.name ?? '…'}</span>
                {group?.description && <span className="text-gray-400">· {group.description}</span>}
            </div>
            <div className="card p-6 space-y-5 max-w-3xl">
                <Field label="Bo‘lim" error={errors.theme_id}><ThemePick value={f.theme} onChange={pickTheme} error={errors.theme_id} /></Field>
                <Field label="Vazifa nomi" error={errors.title}>
                    <div className="relative">
                        <Input value={f.title} onChange={e => setTitle(e.target.value)} className={cx('pr-9', errors.title && 'border-red-300')} maxLength={255} />
                        {f.title && <button type="button" onClick={() => setTitle('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>}
                    </div>
                </Field>
                <Field label="Tavsif" error={errors.description}><textarea rows={3} value={f.description ?? ''} onChange={e => set('description', e.target.value)} className="form-input resize-y" maxLength={2000} /></Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Minimal testlar soni" error={errors.min_test_count}><Input type="text" inputMode="numeric" value={f.min_test_count} onChange={setNum('min_test_count', 1000)} placeholder="1–1000" className={errors.min_test_count && 'border-red-300'} /></Field>
                    <Field label="Minimal o‘tish foizi" hint="(1–100)" error={errors.passing_percentage}><Input type="text" inputMode="numeric" value={f.passing_percentage} onChange={setNum('passing_percentage', 100)} placeholder="1–100" className={errors.passing_percentage && 'border-red-300'} /></Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Boshlanish vaqti" error={errors.start_date}><DateTimePicker value={f.start_date} onChange={v => set('start_date', v)} minDate={id ? undefined : 'today'} /></Field>
                    <Field label="Tugash vaqti" error={errors.end_date}><DateTimePicker value={f.end_date} onChange={v => set('end_date', v)} minDate={f.start_date || 'today'} /></Field>
                </div>
                {id && (
                    <Field label="Holat" error={errors.status}>
                        <div className="flex gap-2">
                            {[1, 0].map(s => (
                                <label key={s} className={cx('flex-1 flex items-center justify-center rounded-lg border px-3 py-2 text-sm cursor-pointer', Number(f.status) === s ? 'border-admin-primary bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}>
                                    <input type="radio" className="hidden" checked={Number(f.status) === s} onChange={() => set('status', s)} />{STATUS[s][0]}
                                </label>
                            ))}
                        </div>
                    </Field>
                )}
            </div>
        </form>
    );
}

/* ---------- 4. Ko'rish ---------- */
const HW_STATUS = { 2: ['Bajarildi', 'green'], 1: ['Jarayonda', 'blue'], 0: ['Bajarilmadi', 'red'] };
const HwBadge = ({ status, className }) => { const [label, color] = HW_STATUS[status] ?? ['—', 'gray']; return <Badge color={color} className={className}>{label}</Badge>; };

export function HomeworkShow() {
    const { groupId, id } = useParams();
    const qc = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const { data: t } = useItem(`/tasks/${id}`);
    const refresh = async () => {
        setRefreshing(true);
        try { await Promise.all([qc.refetchQueries({ queryKey: [`/tasks/${id}`] }), qc.refetchQueries({ queryKey: [`/tasks/${id}/homeworks`] })]); }
        finally { setRefreshing(false); }
    };
    if (!t) return null;

    const tiles = [
        ['Jami natijalar', t.homeworks_count, 'bg-slate-50 border-slate-200 text-slate-700', 'text-slate-900'],
        ['Kutilmoqda', t.progress_count, 'bg-blue-50 border-blue-200 text-blue-700', 'text-blue-700'],
        ['Tasdiqlangan', t.passed_count, 'bg-green-50 border-green-200 text-green-700', 'text-green-700'],
        ['Rad etilgan', t.failed_count, 'bg-red-50 border-red-200 text-red-700', 'text-red-700'],
    ];

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/admin/homeworks/${groupId}`} className="text-gray-400 hover:text-gray-700 transition-colors" title="Orqaga"><ArrowLeft className="w-6 h-6" /></Link>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{t.title} <span className="text-gray-400 font-medium">- {t.group?.name}</span></h1>
                    <StatusBadge status={t.status} />
                </div>
                <div className="flex items-center gap-3">
                    <a href={`/api/admin/tasks/${id}/pdf`} download className="btn-secondary"><Download className="w-4 h-4" /> Yuklab olish</a>
                    <button type="button" onClick={refresh} disabled={refreshing} className="btn-secondary disabled:opacity-60"><RefreshCw className={cx('w-4 h-4', refreshing && 'animate-spin')} /> Yangilash</button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {tiles.map(([label, value, box, num]) => (
                    <div key={label} className={cx('rounded-xl border px-5 py-4', box)}>
                        <p className={cx('text-3xl font-extrabold leading-none', num)}>{value}</p>
                        <p className="mt-2 text-sm font-medium opacity-80">{label}</p>
                    </div>
                ))}
            </div>

            <HomeworkList taskId={id} task={t} />
        </>
    );
}

/* ---------- Studentlar homeworklari: filter + infinite scroll ---------- */
function HomeworkList({ taskId, task }) {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const q = useDebounce(search);
    const sentinel = useRef(null);

    const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: [`/tasks/${taskId}/homeworks`, { search: q, status }],
        queryFn: ({ pageParam = 1 }) => api.get(`/tasks/${taskId}/homeworks`, { params: { search: q, status, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
    });
    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;

    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    return (
        <>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Ism, username yoki telefon..." className="w-72" />
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-input !w-44 shrink-0">
                    <option value="">Barcha holatlar</option>
                    {[2, 1, 0].map(s => <option key={s} value={s}>{HW_STATUS[s][0]}</option>)}
                </select>
                <span className="ml-auto text-sm text-gray-500">{isFetching && !isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin inline" /> : `${total} ta student`}</span>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <THead>
                            <Th className="w-12">#</Th><Th>Student</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th>Holat</Th><Th className="text-right">Amallar</Th>
                        </THead>
                        <tbody className="table-body">
                            {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="table-td"><div className="h-3.5 rounded bg-gray-200 w-3/4" /></td>)}</tr>)
                                : rows.length ? rows.map((h, i) => {
                                    const ok = h.percentage >= task.passing_percentage;
                                    return (
                                        <tr key={h.id}>
                                            <Td className="text-gray-400">{i + 1}</Td>
                                            <Td>
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={h.user?.name} />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{can('show_student') ? <Link to={`/admin/students/${h.user_id}`} className="hover:text-blue-600">{h.user?.name ?? '—'}</Link> : h.user?.name ?? '—'}</p>
                                                        <p className="text-xs text-gray-400 truncate">{h.user?.username ? `@${h.user.username}` : ''}{h.user?.phone ? ` · ${fmtPhone(h.user.phone)}` : ''}</p>
                                                    </div>
                                                </div>
                                            </Td>
                                            <Td className="text-center font-semibold text-green-600">{Number(h.correct_sum ?? 0)}</Td>
                                            <Td className="text-center font-semibold text-red-600">{Number(h.in_correct_sum ?? 0)}</Td>
                                            <Td className="text-center"><span className={cx('font-semibold', h.tests_count >= task.min_test_count ? 'text-green-600' : 'text-gray-800')}>{h.tests_count}</span><span className="text-gray-400"> / {task.min_test_count}</span></Td>
                                            <Td className="text-center">
                                                <Badge color={!h.tests_count ? 'gray' : ok ? 'green' : 'red'} className="!text-sm font-semibold">{h.percentage}%</Badge>
                                            </Td>
                                            <Td><HwBadge status={h.status} className="!text-sm" /></Td>
                                            <Td>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button type="button" className="icon-btn text-green-600 hover:bg-green-50" title="Tasdiqlash"><Check className="w-4 h-4" /></button>
                                                    <button type="button" className="icon-btn text-red-500 hover:bg-red-50" title="Rad etish"><X className="w-4 h-4" /></button>
                                                </div>
                                            </Td>
                                        </tr>
                                    );
                                }) : <Empty colSpan={8} text="Studentlar topilmadi" />}
                        </tbody>
                    </table>
                </div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">
                    {isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : !hasNextPage && rows.length > 10 ? 'Hammasi yuklandi' : ''}
                </div>
            </div>
        </>
    );
}

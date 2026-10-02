import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Ban, BookOpen, ClipboardList, Layers, LoaderCircle, Send, SquarePen, Users } from 'lucide-react';
import api from '../api';
import { useAuth } from '../lib/auth';
import { useDebounce, useItem } from '../lib/hooks';
import { Avatar, Badge, Empty, SearchInput, SkeletonBlock, SkeletonRows, Th, THead, Td } from '../components/ui';
import DateInput from '../components/DateInput';
import ThemeLabel from '../components/ThemeLabel';
import { Bar } from './GroupResults';
import { cx, fmtDate, fmtPhone } from '../lib/utils';

const TABS = [
    { key: 'students', label: 'O‘quvchilar', icon: Users },
    { key: 'tasks', label: 'Vazifalar', icon: ClipboardList },
    { key: 'themes', label: 'Bo‘limlar', icon: BookOpen },
];
const ymd = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const DEFAULT_RANGE = () => ({ from: ymd(new Date(Date.now() - 60 * 86400000)), to: ymd(new Date()) });
const pctColor = p => (p >= 70 ? 'green' : p >= 40 ? 'amber' : 'red');

const Tile = ({ label, value, tone = 'slate', hint }) => {
    const t = { slate: 'bg-slate-50 border-slate-200 text-slate-800', blue: 'bg-blue-50 border-blue-200 text-blue-700', green: 'bg-green-50 border-green-200 text-green-700', red: 'bg-red-50 border-red-200 text-red-700', amber: 'bg-amber-50 border-amber-200 text-amber-700', violet: 'bg-violet-50 border-violet-200 text-violet-700', sky: 'bg-sky-50 border-sky-200 text-sky-700' }[tone];
    return (
        <div className={cx('rounded-2xl border px-5 py-4', t)}>
            <p className="text-3xl font-extrabold leading-none">{value ?? <SkeletonBlock className="h-8 w-12" />}</p>
            <p className="mt-2 text-sm font-semibold opacity-80">{label}</p>
            {hint && <p className="mt-0.5 text-sm opacity-70">{hint}</p>}
        </div>
    );
};
const Num = ({ children, tone }) => <span className={cx('text-lg font-bold', tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : 'text-gray-900')}>{children}</span>;
const Pct = ({ value }) => <Badge color={pctColor(value)} className="!text-base font-bold">{value}%</Badge>;
const Sentinel = ({ innerRef, loading }) => <div ref={innerRef} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">{loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : ''}</div>;

function useTabList(url, params) {
    const sentinel = useRef(null);
    const qr = useInfiniteQuery({
        queryKey: [url, params],
        queryFn: ({ pageParam = 1 }) => api.get(url, { params: { ...params, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page && last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
        staleTime: 30_000,
    });
    const rows = qr.data?.pages.flatMap(p => p.data) ?? [];
    const first = qr.data?.pages[0];
    useEffect(() => {
        if (!sentinel.current || !qr.hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !qr.isFetchingNextPage && qr.fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [qr.hasNextPage, qr.isFetchingNextPage, qr.fetchNextPage, rows.length]);
    return { ...qr, rows, first, sentinel, loading: qr.isLoading || (!qr.data && qr.isFetching) };
}

/* ---------- O'quvchilar ---------- */
function StudentsTab({ id, range }) {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const q = useDebounce(search);
    const L = useTabList(`/results/groups/${id}/students`, { search: q, status, ...range });

    return (
        <>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Ism, username yoki telefon..." className="w-72" />
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-input !w-44 shrink-0"><option value="">Barcha holatlar</option><option value="active">Faol</option><option value="blocked">Bloklangan</option></select>
                <span className="ml-auto text-sm font-medium text-gray-500">{L.first?.total ?? 0} ta o‘quvchi</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th>O‘quvchi</Th><Th className="text-center">Vazifalar</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th className="text-center">Imkoniyat</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={7} rows={5} /> : L.rows.length ? L.rows.map(s => {
                            const c = Number(s.correct_sum ?? 0), ic = Number(s.in_correct_sum ?? 0), all = c + ic, pct = all ? Math.round(c * 100 / all) : 0;
                            const blocked = Number(s.max_attempts) <= 0;
                            return (
                                <tr key={s.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={s.name} size="w-10 h-10 text-sm" />
                                            <div className="min-w-0">
                                                <p className="text-base font-semibold text-gray-900 truncate">{can('show_student') ? <Link to={`/admin/students/${s.id}`} className="hover:text-blue-600">{s.name}</Link> : s.name}</p>
                                                <p className="text-sm text-gray-500 truncate">{s.username ? `@${s.username}` : ''}{s.username && s.phone ? ' · ' : ''}{s.phone ? fmtPhone(s.phone) : ''}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td className="text-center whitespace-nowrap"><span className="text-base font-bold text-green-600">{s.hw_passed}</span><span className="text-gray-300 mx-1">/</span><span className="text-base font-bold text-blue-600">{s.hw_progress}</span><span className="text-gray-300 mx-1">/</span><span className="text-base font-bold text-red-600">{s.hw_failed}</span></Td>
                                    <Td className="text-center"><Num tone="green">{c}</Num></Td>
                                    <Td className="text-center"><Num tone="red">{ic}</Num></Td>
                                    <Td className="text-center"><Num>{all}</Num></Td>
                                    <Td className="text-center">{all ? <Pct value={pct} /> : <span className="text-gray-300">—</span>}</Td>
                                    <Td className="text-center">{blocked ? <Badge color="red" className="!text-sm"><Ban className="w-3.5 h-3.5 mr-1" /> Bloklangan</Badge> : <span className="text-lg font-bold text-gray-900">{s.max_attempts}</span>}</Td>
                                </tr>
                            );
                        }) : <Empty colSpan={7} text="O‘quvchilar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} />
            </div>
            <p className="mt-2 text-sm text-gray-500">Vazifalar ustuni: bajarildi / jarayonda / bajarilmadi. To‘g‘ri va noto‘g‘ri — tanlangan davrdagi vazifaga saqlangan natijalar.</p>
        </>
    );
}

/* ---------- Vazifalar ---------- */
function TasksTab({ id, range }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const q = useDebounce(search);
    const L = useTabList(`/results/groups/${id}/tasks`, { search: q, status, ...range });

    return (
        <>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Vazifa nomi..." className="w-72" />
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-input !w-44 shrink-0"><option value="">Barcha holatlar</option><option value="1">Faol</option><option value="0">Tugallangan</option></select>
                <span className="ml-auto text-sm font-medium text-gray-500">{L.first?.stats?.total ?? 0} ta vazifa · {L.first?.stats?.themes ?? 0} ta bo‘lim</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th>Vazifa</Th><Th>Holat</Th><Th className="text-center">O‘quvchilar</Th><Th>Bajarilishi</Th><Th className="text-center">O‘rtacha foiz</Th><Th>Min. test / foiz</Th><Th>Muddat</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={7} rows={5} /> : L.rows.length ? L.rows.map(t => {
                            const done = t.passed_count + t.failed_count;
                            const rate = done ? Math.round(t.passed_count * 100 / done) : 0;
                            const avg = Math.round(Number(t.avg_percentage ?? 0));
                            return (
                                <tr key={t.id}>
                                    <Td>
                                        <Link to={`/admin/homeworks/${id}/${t.id}`} className="text-base font-semibold text-gray-900 hover:text-blue-600">{t.title}</Link>
                                        <div className="mt-1 text-sm text-gray-500">{t.theme ? <ThemeLabel theme={t.theme} /> : '—'}</div>
                                    </Td>
                                    <Td>{t.status === 1 ? <Badge color="green" className="!text-sm">Faol</Badge> : <Badge color="gray" className="!text-sm">Tugallangan</Badge>}</Td>
                                    <Td className="text-center"><Num>{t.homeworks_count}</Num></Td>
                                    <Td>{done ? <Bar value={rate} label={`${t.passed_count} ✓ · ${t.progress_count} ⟳ · ${t.failed_count} ✕`} /> : <span className="text-sm text-gray-400">{t.progress_count} ta jarayonda</span>}</Td>
                                    <Td className="text-center">{avg ? <Pct value={avg} /> : <span className="text-gray-300">—</span>}</Td>
                                    <Td className="whitespace-nowrap"><Num>{t.min_test_count}</Num><span className="text-gray-400"> / </span><Num>{t.passing_percentage}%</Num></Td>
                                    <Td className="text-gray-600 whitespace-nowrap text-sm leading-6"><span className="block">{fmtDate(t.start_date)}</span><span className="block">{fmtDate(t.end_date)}</span></Td>
                                </tr>
                            );
                        }) : <Empty colSpan={7} text="Vazifalar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} />
            </div>
        </>
    );
}

/* ---------- Bo'limlar qamrovi ---------- */
function ThemesTab({ id }) {
    const [covered, setCovered] = useState('');
    const L = useTabList(`/results/groups/${id}/themes`, { covered });
    const f = L.first;

    return (
        <>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <select value={covered} onChange={e => setCovered(e.target.value)} className="form-input !w-56 shrink-0"><option value="">Barcha bo‘limlar</option><option value="1">Vazifa berilganlar</option><option value="0">Vazifa berilmaganlar</option></select>
                <span className="ml-auto text-sm font-medium text-gray-500">{f ? `${f.covered} / ${f.themes_total} bo‘limga vazifa berilgan` : ''}</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th>Bo‘lim</Th><Th>Vazifa</Th><Th>Bajarilishi</Th><Th className="text-center">O‘rtacha foiz</Th><Th className="text-center">Mashg‘ulotlar</Th><Th className="text-center">To‘g‘ri / Noto‘g‘ri</Th><Th className="text-center">Foiz</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={7} rows={6} /> : L.rows.length ? L.rows.map(t => {
                            const done = t.passed + t.failed;
                            return (
                                <tr key={t.id} className={cx(!t.covered && 'opacity-80')}>
                                    <Td className="text-base font-semibold text-gray-900"><ThemeLabel theme={t} /></Td>
                                    <Td>{t.covered ? <Badge color="green" className="!text-sm">{t.tasks_count} ta vazifa</Badge> : <Badge color="gray" className="!text-sm">Berilmagan</Badge>}</Td>
                                    <Td>{done ? <Bar value={Math.round(t.passed * 100 / done)} label={`${t.passed} ✓ · ${t.failed} ✕`} /> : t.progress ? <span className="text-sm text-gray-400">{t.progress} ta jarayonda</span> : <span className="text-gray-300">—</span>}</Td>
                                    <Td className="text-center">{t.avg_percentage ? <Pct value={t.avg_percentage} /> : <span className="text-gray-300">—</span>}</Td>
                                    <Td className="text-center"><Num>{t.attempts}</Num>{t.students > 0 && <span className="block text-xs text-gray-500">{t.students} o‘quvchi</span>}</Td>
                                    <Td className="text-center whitespace-nowrap"><Num tone="green">{t.correct}</Num><span className="text-gray-300 mx-1">/</span><Num tone="red">{t.in_correct}</Num></Td>
                                    <Td className="text-center">{t.correct + t.in_correct ? <Pct value={t.percentage} /> : <span className="text-gray-300">—</span>}</Td>
                                </tr>
                            );
                        }) : <Empty colSpan={7} text="Bo‘limlar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} />
            </div>
        </>
    );
}

/* ---------- Sahifa ---------- */
export default function GroupResultShow() {
    const { id } = useParams();
    const { pathname } = useLocation();
    const { can } = useAuth();
    const fromGroups = pathname.startsWith('/admin/groups/');
    const backTo = fromGroups ? '/admin/groups' : '/admin/results/groups';
    const [sp, setSp] = useSearchParams();
    const tab = TABS.some(t => t.key === sp.get('tab')) ? sp.get('tab') : 'students';
    const setTab = k => setSp({ tab: k }, { replace: true });
    const [range, setRange] = useState(DEFAULT_RANGE);
    const { data } = useItem(`/results/groups/${id}`);
    const g = data?.group;
    const s = data?.summary;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to={backTo} className="text-gray-400 hover:text-gray-700 transition-colors" title="Orqaga"><ArrowLeft className="w-6 h-6" /></Link>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{g ? g.name : <SkeletonBlock className="h-7 w-48" />}</h1>
                    {g?.telegram_chat_id && <Badge color="blue" className="!text-sm"><Send className="w-3.5 h-3.5 mr-1" /> Telegram</Badge>}
                </div>
                <div className="flex items-center gap-2">
                    {can('access_task') && <Link to={`/admin/homeworks/${id}`} className="btn-secondary"><ClipboardList className="w-4 h-4" /> Uyga vazifalar</Link>}
                    {can('update_group') && <Link to={`/admin/groups/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
                </div>
            </div>

            {/* Profil + qamrov */}
            <div className="card p-5 md:p-6 mb-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                        <span className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm"><Layers className="w-10 h-10" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-2xl font-extrabold text-gray-900 truncate">{g?.name ?? <SkeletonBlock className="h-7 w-48" />}</p>
                            <p className="mt-1 text-base text-gray-600">{g ? (g.description || 'Tavsif yo‘q') : '…'}</p>
                            <div className="mt-3 max-w-xl">
                                <div className="flex items-center justify-between mb-1.5"><span className="text-sm font-semibold text-gray-700">Bo‘limlar qamrovi</span><span className="text-sm font-bold text-gray-900">{s ? `${s.themes_covered} / ${s.themes_total} bo‘lim · ${s.coverage}%` : '…'}</span></div>
                                <div className="h-3.5 rounded-full bg-gray-100 overflow-hidden"><div className={cx('h-full rounded-full transition-all', s && (s.coverage >= 70 ? 'bg-green-500' : s.coverage >= 40 ? 'bg-amber-400' : 'bg-red-400'))} style={{ width: `${s?.coverage ?? 0}%` }} /></div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 lg:w-[30rem] shrink-0">
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center"><p className="text-3xl font-extrabold text-emerald-700 leading-none">{s ? s.students.total : '…'}</p><p className="mt-2 text-sm font-semibold text-emerald-600">O‘quvchi</p></div>
                        <div className={cx('rounded-2xl px-4 py-3 text-center', s?.students.blocked ? 'bg-red-50' : 'bg-gray-50')}><p className={cx('text-3xl font-extrabold leading-none', s?.students.blocked ? 'text-red-700' : 'text-gray-700')}>{s ? s.students.blocked : '…'}</p><p className={cx('mt-2 text-sm font-semibold', s?.students.blocked ? 'text-red-600' : 'text-gray-500')}>Bloklangan</p></div>
                        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center"><p className="text-3xl font-extrabold text-sky-700 leading-none">{s ? s.students.active_week : '…'}</p><p className="mt-2 text-sm font-semibold text-sky-600">Haftada faol</p></div>
                    </div>
                </div>
            </div>

            {/* Umumiy ko'rsatkichlar */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <Tile label="Vazifalar" value={s?.tasks.total} hint={s ? `${s.tasks.active} faol · ${s.tasks.finished} tugallangan` : undefined} />
                <Tile label="Vazifa bajarilishi" value={s ? `${s.homeworks.pass_rate}%` : undefined} tone="green" hint={s ? `${s.homeworks.passed} ✓ · ${s.homeworks.failed} ✕` : undefined} />
                <Tile label="Jarayonda" value={s?.homeworks.progress} tone="blue" />
                <Tile label="O‘rtacha foiz" value={s ? `${s.homeworks.avg_percentage}%` : undefined} tone="violet" hint={s ? `${s.homeworks.answered} ta javob` : undefined} />
                <Tile label="Imtihonlar" value={s?.results.exams} tone="amber" hint={s ? `${s.results.exams_passed} ta o‘tdi` : undefined} />
                <Tile label="Mashg‘ulotlar" value={s?.results.trainings} tone="sky" hint={s ? `umumiy ${s.results.percentage}% to‘g‘ri` : undefined} />
            </div>

            {/* Tablar + sana */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button key={key} type="button" onClick={() => setTab(key)} className={cx('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all', tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
                            <Icon className={cx('w-4 h-4', tab === key ? 'text-admin-primary' : 'text-gray-400')} />{label}
                        </button>
                    ))}
                </div>
                {tab !== 'themes' && (
                    <div className="flex items-center gap-2">
                        <DateInput value={range.from} onChange={v => setRange(r => ({ ...r, from: v }))} maxDate={range.to} placeholder="Boshlanish" className="w-40" />
                        <span className="text-gray-400">—</span>
                        <DateInput value={range.to} onChange={v => setRange(r => ({ ...r, to: v }))} minDate={range.from} placeholder="Tugash" className="w-40" />
                        <button type="button" onClick={() => setRange(DEFAULT_RANGE())} className="btn-secondary px-3" title="Oxirgi 60 kun">60 kun</button>
                    </div>
                )}
            </div>

            {tab === 'students' && <StudentsTab id={id} range={range} />}
            {tab === 'tasks' && <TasksTab id={id} range={range} />}
            {tab === 'themes' && <ThemesTab id={id} />}
        </>
    );
}

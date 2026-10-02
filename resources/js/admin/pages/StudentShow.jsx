import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Ban, BookOpen, ClipboardList, FileQuestion, Layers, LoaderCircle, ShieldCheck } from 'lucide-react';
import api from '../api';
import { useAuth } from '../lib/auth';
import { useDebounce, useItem } from '../lib/hooks';
import { Avatar, Badge, Empty, GroupChips, SearchInput, SkeletonBlock, SkeletonRows, Th, THead, Td } from '../components/ui';
import MultiSelect from '../components/MultiSelect';
import DateInput from '../components/DateInput';
import ThemeLabel from '../components/ThemeLabel';
import { cx, fmtDate, fmtPhone } from '../lib/utils';

const pctOf = (c, ic) => (c + ic ? Math.round(c * 100 / (c + ic)) : 0);
const pctColor = p => (p >= 90 ? 'green' : p >= 70 ? 'amber' : 'red');
const HW_STATUS = { 2: ['Bajarildi', 'green'], 1: ['Jarayonda', 'blue'], 0: ['Bajarilmadi', 'red'] };
const TABS = [
    { key: 'homeworks', label: 'Uyga vazifalar', icon: ClipboardList },
    { key: 'exams', label: 'Imtihonlar', icon: FileQuestion },
    { key: 'trainings', label: 'Mashg‘ulotlar', icon: BookOpen },
    { key: 'themes', label: 'Bo‘limlar', icon: Layers },
];
const ymd = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const DEFAULT_RANGE = () => ({ from: ymd(new Date(Date.now() - 60 * 86400000)), to: ymd(new Date()) });

/* ---------- umumiy bo'laklar ---------- */
const Tile = ({ label, value, tone = 'slate' }) => {
    const t = { slate: 'bg-slate-50 border-slate-200 text-slate-800', blue: 'bg-blue-50 border-blue-200 text-blue-700', green: 'bg-green-50 border-green-200 text-green-700', red: 'bg-red-50 border-red-200 text-red-700', amber: 'bg-amber-50 border-amber-200 text-amber-700', violet: 'bg-violet-50 border-violet-200 text-violet-700' }[tone];
    return (
        <div className={cx('rounded-2xl border px-5 py-4', t)}>
            <p className="text-3xl font-extrabold leading-none">{value ?? <SkeletonBlock className="h-8 w-12" />}</p>
            <p className="mt-2 text-sm font-semibold opacity-80">{label}</p>
        </div>
    );
};
const Pct = ({ value, ok }) => <span className={cx('inline-flex min-w-[3.5rem] justify-center rounded-lg px-2.5 py-1 text-base font-bold', ok === undefined ? { green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700' }[pctColor(value)] : ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{value}%</span>;
const Num = ({ children, tone }) => <span className={cx('text-lg font-bold', tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : 'text-gray-900')}>{children}</span>;
const Sentinel = ({ innerRef, loading, done }) => <div ref={innerRef} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">{loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : done ? 'Hammasi yuklandi' : ''}</div>;
const Outcome = ({ r }) => (r.status !== 1 ? <Badge color="gray" className="!text-sm">Tugallanmagan</Badge> : r.is_passed ? <Badge color="green" className="!text-sm">O‘tdi</Badge> : <Badge color="red" className="!text-sm">O‘ta olmadi</Badge>);

/** Tab ro'yxati: faqat ochiq tab so'rov yuboradi, kesh saqlanadi. */
function useTabList(url, params) {
    const sentinel = useRef(null);
    const qr = useInfiniteQuery({
        queryKey: [url, params],
        queryFn: ({ pageParam = 1 }) => api.get(url, { params: { ...params, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
        staleTime: 30_000,
    });
    const rows = qr.data?.pages.flatMap(p => p.data) ?? [];
    const stats = qr.data?.pages[0]?.stats;
    const total = qr.data?.pages[0]?.total ?? 0;
    useEffect(() => {
        if (!sentinel.current || !qr.hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !qr.isFetchingNextPage && qr.fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [qr.hasNextPage, qr.isFetchingNextPage, qr.fetchNextPage, rows.length]);
    return { ...qr, rows, stats, total, sentinel, loading: qr.isLoading || (!qr.data && qr.isFetching) };
}

/* ---------- 1. Uyga vazifalar ---------- */
function HomeworksTab({ id, range, themeOpts }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [themes, setThemes] = useState([]);
    const q = useDebounce(search);
    const L = useTabList(`/results/students/${id}/homeworks`, { search: q, status, themes, ...range });
    const s = L.stats;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <Tile label="Vazifalar" value={s?.total} />
                <Tile label="Bajarildi" value={s?.passed} tone="green" />
                <Tile label="Jarayonda" value={s?.progress} tone="blue" />
                <Tile label="Bajarilmadi" value={s?.failed} tone="red" />
                <Tile label="O‘rtacha foiz" value={s ? `${s.avg_percentage}%` : undefined} tone="violet" />
            </div>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Vazifa nomi..." className="w-64" />
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-input !w-44 shrink-0">
                    <option value="">Barcha holatlar</option>{[2, 1, 0].map(k => <option key={k} value={k}>{HW_STATUS[k][0]}</option>)}
                </select>
                <MultiSelect value={themes} onChange={setThemes} options={themeOpts} placeholder="Barcha bo‘limlar" allLabel="Barcha bo‘limlar" searchPlaceholder="Bo‘lim qidirish..." className="w-72" />
                <span className="ml-auto text-sm font-medium text-gray-500">{L.total} ta</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th>Vazifa</Th><Th>Holat</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th>Muddat</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={7} rows={5} /> : L.rows.length ? L.rows.map(h => {
                            const [label, color] = HW_STATUS[h.status] ?? ['—', 'gray'];
                            return (
                                <tr key={h.id}>
                                    <Td>
                                        <Link to={`/admin/homeworks/${h.group_id}/${h.task_id}`} className="text-base font-semibold text-gray-900 hover:text-blue-600">{h.title}</Link>
                                        <div className="mt-1 text-sm text-gray-500"><ThemeLabel theme={{ title: h.theme_title, title_krill: h.theme_title_krill, icon_type: h.theme_icon_type, icon: h.theme_icon }} /></div>
                                    </Td>
                                    <Td><Badge color={color} className="!text-sm">{label}</Badge></Td>
                                    <Td className="text-center"><Num tone="green">{Number(h.correct_sum ?? 0)}</Num></Td>
                                    <Td className="text-center"><Num tone="red">{Number(h.in_correct_sum ?? 0)}</Num></Td>
                                    <Td className="text-center"><Num>{h.tests_count}</Num>{h.tests_count !== h.min_test_count && <span className="text-gray-400 text-base"> / {h.min_test_count}</span>}</Td>
                                    <Td className="text-center">{h.tests_count ? <Pct value={h.percentage} ok={h.percentage >= h.passing_percentage} /> : <span className="text-gray-300">—</span>}</Td>
                                    <Td className="text-gray-600 whitespace-nowrap text-sm leading-6"><span className="block">{fmtDate(h.start_date)}</span><span className="block">{fmtDate(h.end_date)}</span></Td>
                                </tr>
                            );
                        }) : <Empty colSpan={7} text="Vazifalar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} done={!L.hasNextPage && L.rows.length > 15} />
            </div>
        </>
    );
}

/* ---------- 2. Imtihonlar (20 / 50) ---------- */
function ExamsTab({ id, range }) {
    const [type, setType] = useState('');
    const [passed, setPassed] = useState('');
    const L = useTabList(`/results/students/${id}/exams`, { type, passed, ...range });
    const s = L.stats;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <Tile label="Imtihonlar" value={s?.total} />
                <Tile label="O‘tdi" value={s?.passed} tone="green" />
                <Tile label="O‘ta olmadi" value={s?.failed} tone="red" />
                <Tile label="Tugallanmagan" value={s?.unfinished} />
                <Tile label="O‘rtacha / Eng yaxshi" value={s ? `${s.avg_percentage}% / ${s.best_percentage}%` : undefined} tone="violet" />
            </div>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <select value={type} onChange={e => setType(e.target.value)} className="form-input !w-40 shrink-0"><option value="">Barcha turlar</option><option value="20_TALIK">20 talik</option><option value="50_TALIK">50 talik</option></select>
                <select value={passed} onChange={e => setPassed(e.target.value)} className="form-input !w-44 shrink-0"><option value="">Barcha natijalar</option><option value="1">O‘tganlar</option><option value="0">O‘ta olmaganlar</option><option value="unfinished">Tugallanmaganlar</option></select>
                <span className="ml-auto text-sm font-medium text-gray-500">{L.total} ta</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th className="w-12">#</Th><Th>Tur</Th><Th>Natija</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th>Sana</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={8} rows={5} /> : L.rows.length ? L.rows.map((r, i) => (
                            <tr key={r.id}>
                                <Td className="text-gray-400">{i + 1}</Td>
                                <Td><Badge color={r.type === '50_TALIK' ? 'purple' : 'blue'} className="!text-sm">{r.type === '50_TALIK' ? '50 talik' : '20 talik'}</Badge></Td>
                                <Td><Outcome r={r} /></Td>
                                <Td className="text-center"><Num tone="green">{r.correct}</Num></Td>
                                <Td className="text-center"><Num tone="red">{r.in_correct}</Num></Td>
                                <Td className="text-center"><Num>{r.correct + r.in_correct}</Num>{r.correct + r.in_correct !== r.all_questions && <span className="text-gray-400 text-base"> / {r.all_questions}</span>}</Td>
                                <Td className="text-center">{r.correct + r.in_correct ? <Pct value={pctOf(r.correct, r.in_correct)} /> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="text-gray-600 whitespace-nowrap">{fmtDate(r.created_at)}</Td>
                            </tr>
                        )) : <Empty colSpan={8} text="Imtihonlar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} done={!L.hasNextPage && L.rows.length > 15} />
            </div>
        </>
    );
}

/* ---------- 3. Mashg'ulotlar (vazifadan tashqari, mavzu bo'yicha) ---------- */
function TrainingsTab({ id, range, themeOpts }) {
    const [themes, setThemes] = useState([]);
    const [passed, setPassed] = useState('');
    const L = useTabList(`/results/students/${id}/trainings`, { themes, passed, ...range });
    const s = L.stats;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <Tile label="Mashg‘ulotlar" value={s?.total} />
                <Tile label="Bo‘limlar" value={s?.themes} tone="blue" />
                <Tile label="Tugallanmagan" value={s?.unfinished} />
                <Tile label="To‘g‘ri / Noto‘g‘ri" value={s ? `${s.correct} / ${s.in_correct}` : undefined} tone="amber" />
                <Tile label="O‘rtacha foiz" value={s ? `${s.avg_percentage}%` : undefined} tone="violet" />
            </div>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <MultiSelect value={themes} onChange={setThemes} options={themeOpts} placeholder="Barcha bo‘limlar" allLabel="Barcha bo‘limlar" searchPlaceholder="Bo‘lim qidirish..." className="w-72" />
                <select value={passed} onChange={e => setPassed(e.target.value)} className="form-input !w-44 shrink-0"><option value="">Barcha natijalar</option><option value="1">O‘tganlar</option><option value="0">O‘ta olmaganlar</option><option value="unfinished">Tugallanmaganlar</option></select>
                <span className="ml-auto text-sm font-medium text-gray-500">{L.total} ta</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th className="w-12">#</Th><Th>Bo‘lim</Th><Th>Natija</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th>Sana</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={8} rows={5} /> : L.rows.length ? L.rows.map((r, i) => (
                            <tr key={r.id}>
                                <Td className="text-gray-400">{i + 1}</Td>
                                <Td className="text-base font-semibold text-gray-900">{r.theme ? <><ThemeLabel theme={r.theme} />{r.theme.deleted_at && <span className="ml-2 text-xs font-normal text-gray-400">(o‘chirilgan)</span>}</> : <span className="text-gray-400 font-normal">Bo‘lim o‘chirilgan</span>}</Td>
                                <Td><Outcome r={r} /></Td>
                                <Td className="text-center"><Num tone="green">{r.correct}</Num></Td>
                                <Td className="text-center"><Num tone="red">{r.in_correct}</Num></Td>
                                <Td className="text-center"><Num>{r.correct + r.in_correct}</Num>{r.correct + r.in_correct !== r.all_questions && <span className="text-gray-400 text-base"> / {r.all_questions}</span>}</Td>
                                <Td className="text-center">{r.correct + r.in_correct ? <Pct value={pctOf(r.correct, r.in_correct)} /> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="text-gray-600 whitespace-nowrap">{fmtDate(r.created_at)}</Td>
                            </tr>
                        )) : <Empty colSpan={8} text="Mashg‘ulotlar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} done={!L.hasNextPage && L.rows.length > 15} />
            </div>
        </>
    );
}

/* ---------- 4. Bo'limlar bo'yicha ---------- */
const KIND_OPTS = [{ id: 'homework', label: 'Uyga vazifa' }, { id: 'training', label: 'Mashg‘ulot' }];
function ThemesTab({ id, range }) {
    const [kinds, setKinds] = useState(['homework', 'training']);
    const [solved, setSolved] = useState('');
    const L = useTabList(`/results/students/${id}/themes`, { kinds: kinds.length ? kinds : ['homework', 'training'], solved, ...range });
    const s = L.stats;
    const pct = s && s.correct + s.in_correct ? Math.round(s.correct * 100 / (s.correct + s.in_correct)) : 0;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <Tile label="Yechilgan bo‘limlar" value={s ? `${s.solved_themes} / ${s.themes_total}` : undefined} />
                <Tile label="Urinishlar" value={s?.attempts} tone="blue" />
                <Tile label="To‘g‘ri" value={s?.correct} tone="green" />
                <Tile label="Noto‘g‘ri" value={s?.in_correct} tone="red" />
                <Tile label="Umumiy foiz" value={s ? `${pct}%` : undefined} tone="violet" />
            </div>
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <MultiSelect value={kinds} onChange={v => setKinds(v)} options={KIND_OPTS} placeholder="Vazifa va mashg‘ulot" allLabel="Vazifa va mashg‘ulot" searchPlaceholder="Tur..." className="w-64" />
                <select value={solved} onChange={e => setSolved(e.target.value)} className="form-input !w-48 shrink-0"><option value="">Barcha bo‘limlar</option><option value="1">Yechilganlar</option><option value="0">Yechilmaganlar</option></select>
                <span className="ml-auto text-sm font-medium text-gray-500">{L.total} ta bo‘lim</span>
            </div>
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th>Bo‘lim</Th><Th>Vazifalar</Th><Th className="text-center">Urinishlar</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th className="text-center">Eng yaxshi</Th><Th>Oxirgi</Th></THead>
                    <tbody className="table-body">
                        {L.loading ? <SkeletonRows cols={9} rows={6} /> : L.rows.length ? L.rows.map(t => (
                            <tr key={t.id} className={cx(!t.attempts && 'opacity-70')}>
                                <Td className="text-base font-semibold text-gray-900"><ThemeLabel theme={t} />{t.deleted_at && <span className="ml-2 text-xs font-normal text-gray-400">(o‘chirilgan)</span>}</Td>
                                <Td>{t.tasks_count ? <span className="whitespace-nowrap"><span className="text-base font-bold text-green-600">{t.hw_passed}</span><span className="text-gray-300 mx-1">/</span><span className="text-base font-bold text-blue-600">{t.hw_progress}</span><span className="text-gray-300 mx-1">/</span><span className="text-base font-bold text-red-600">{t.hw_failed}</span></span> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="text-center"><Num>{t.attempts}</Num>{t.hw_attempts > 0 && t.hw_attempts < t.attempts && <span className="block text-xs text-gray-500">{t.hw_attempts} vazifa</span>}</Td>
                                <Td className="text-center"><Num tone="green">{t.correct}</Num></Td>
                                <Td className="text-center"><Num tone="red">{t.in_correct}</Num></Td>
                                <Td className="text-center"><Num>{t.total}</Num></Td>
                                <Td className="text-center">{t.total ? <Pct value={t.percentage} /> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="text-center">{t.attempts ? <span className="text-base font-bold text-gray-800">{t.best}%</span> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="text-gray-600 whitespace-nowrap">{t.last_at ? fmtDate(t.last_at) : '—'}</Td>
                            </tr>
                        )) : <Empty colSpan={9} text="Bo‘limlar yo‘q" />}
                    </tbody>
                </table></div>
                <Sentinel innerRef={L.sentinel} loading={L.isFetchingNextPage} done={!L.hasNextPage && L.rows.length > 15} />
            </div>
            <p className="mt-2 text-sm text-gray-500">Vazifalar ustuni: bajarildi / jarayonda / bajarilmadi. Urinishlar — tanlangan turdagi yakunlangan natijalar.</p>
        </>
    );
}

/* ---------- Sahifa ---------- */
export default function StudentShow() {
    const { id } = useParams();
    const { can } = useAuth();
    const [sp, setSp] = useSearchParams();
    const tab = TABS.some(t => t.key === sp.get('tab')) ? sp.get('tab') : 'homeworks';
    const setTab = k => setSp({ tab: k }, { replace: true });
    const [range, setRange] = useState(DEFAULT_RANGE);
    const { data } = useItem(`/results/students/${id}`);
    const { data: filters } = useItem('/results/filters', tab === 'homeworks' || tab === 'trainings'); // faqat bo'lim filtri bor tablarda
    const themeOpts = (filters?.themes ?? []).map(t => ({ id: t.id, label: t.title ?? t.title_krill ?? '', render: <ThemeLabel theme={t} /> }));
    const st = data?.student;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to="/admin/results/students" className="text-gray-400 hover:text-gray-700 transition-colors" title="Orqaga"><ArrowLeft className="w-6 h-6" /></Link>
                    <h1 className="text-2xl font-bold text-gray-900 truncate">{st ? st.name : <SkeletonBlock className="h-7 w-48" />}</h1>
                    {st && (st.blocked ? <Badge color="red" className="!text-sm"><Ban className="w-3.5 h-3.5 mr-1" /> Bloklangan</Badge> : <Badge color="green" className="!text-sm"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Faol</Badge>)}
                </div>
                {can('update_student') && <Link to="/admin/students-manage" className="btn-secondary">Boshqaruv</Link>}
            </div>

            {/* Profil: katta, qisqa */}
            <div className="card p-5 md:p-6 mb-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                        <Avatar name={st?.name ?? '?'} size="w-20 h-20 text-3xl" />
                        <div className="min-w-0">
                            <p className="text-2xl font-extrabold text-gray-900 truncate">{st?.name ?? <SkeletonBlock className="h-7 w-48" />}</p>
                            <p className="mt-1 text-base text-gray-600 truncate">
                                {st?.username && <span>@{st.username}</span>}
                                {st?.username && st?.phone && <span className="text-gray-300"> · </span>}
                                {st?.phone && <span>{fmtPhone(st.phone)}</span>}
                            </p>
                            <div className="mt-2.5"><GroupChips groups={st?.groups} empty="Guruhsiz" /></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 lg:w-[30rem] shrink-0">
                        <div className={cx('rounded-2xl px-4 py-3 text-center', st?.blocked ? 'bg-red-50' : 'bg-emerald-50')}>
                            <p className={cx('text-3xl font-extrabold leading-none', st?.blocked ? 'text-red-700' : 'text-emerald-700')}>{st ? st.max_attempts : '…'}</p>
                            <p className={cx('mt-2 text-sm font-semibold', st?.blocked ? 'text-red-600' : 'text-emerald-600')}>Imkoniyat</p>
                        </div>
                        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center">
                            <p className="text-base font-bold text-sky-800 leading-tight">{st ? fmtDate(st.created_at).slice(0, 10) : '…'}</p>
                            <p className="mt-2 text-sm font-semibold text-sky-600">Ro‘yxatdan o‘tgan</p>
                        </div>
                        <div className="rounded-2xl bg-violet-50 px-4 py-3 text-center">
                            <p className="text-base font-bold text-violet-800 leading-tight">{st ? (st.last_activity_at ? fmtDate(st.last_activity_at).slice(0, 10) : '—') : '…'}</p>
                            <p className="mt-2 text-sm font-semibold text-violet-600">Oxirgi faollik</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tablar (segment) + sana oralig'i */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-1">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button key={key} type="button" onClick={() => setTab(key)}
                            className={cx('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all', tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
                            <Icon className={cx('w-4 h-4', tab === key ? 'text-admin-primary' : 'text-gray-400')} />{label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <DateInput value={range.from} onChange={v => setRange(r => ({ ...r, from: v }))} maxDate={range.to} placeholder="Boshlanish" className="w-40" />
                    <span className="text-gray-400">—</span>
                    <DateInput value={range.to} onChange={v => setRange(r => ({ ...r, to: v }))} minDate={range.from} placeholder="Tugash" className="w-40" />
                    <button type="button" onClick={() => setRange(DEFAULT_RANGE())} className="btn-secondary px-3" title="Oxirgi 60 kun">60 kun</button>
                </div>
            </div>

            {tab === 'homeworks' && <HomeworksTab id={id} range={range} themeOpts={themeOpts} />}
            {tab === 'exams' && <ExamsTab id={id} range={range} />}
            {tab === 'trainings' && <TrainingsTab id={id} range={range} themeOpts={themeOpts} />}
            {tab === 'themes' && <ThemesTab id={id} range={range} />}
        </>
    );
}

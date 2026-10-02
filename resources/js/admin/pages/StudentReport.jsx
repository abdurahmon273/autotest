import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Award, BookOpen, Calendar, ClipboardList, FileQuestion, Flame, LoaderCircle, Search, Target, TrendingDown, TrendingUp, X } from 'lucide-react';
import api, { messageOf } from '../api';
import { useDebounce } from '../lib/hooks';
import { Avatar, Badge, GroupChips, PageHeader } from '../components/ui';
import DateInput from '../components/DateInput';
import { cx, fmtDate, fmtPhone } from '../lib/utils';

/* Ranglar: dataviz palitrasi (seriya ko'k, status ranglari alohida) */
const SERIES = '#2a78d6';
const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };
const pctTone = p => (p >= 90 ? 'good' : p >= 75 ? 'warning' : p >= 60 ? 'serious' : 'critical');
const toneBadge = { good: 'green', warning: 'amber', serious: 'amber', critical: 'red' };
const fmtDay = d => { const x = new Date(d); return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}`; };

/* ---------- O'quvchi tanlash ---------- */
function StudentPicker({ value, onChange }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const dq = useDebounce(q, 250);
    const box = useRef(null);
    const { data, isFetching } = useQuery({ queryKey: ['/students/search', dq], queryFn: () => api.get('/students/search', { params: { search: dq } }).then(r => r.data), enabled: open, placeholderData: p => p, staleTime: 60_000 });
    useEffect(() => { const h = e => !box.current?.contains(e.target) && setOpen(false); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

    if (value) return (
        <div className="form-input flex items-center justify-between gap-3 py-2 cursor-pointer" onClick={() => { onChange(null); setOpen(true); }}>
            <span className="flex items-center gap-3 min-w-0"><Avatar name={value.name} /><span className="min-w-0"><span className="block font-semibold text-gray-900 truncate">{value.name}</span><span className="block text-xs text-gray-500 truncate">{value.username ? `@${value.username}` : ''}{value.phone ? ` · ${fmtPhone(value.phone)}` : ''}</span></span></span>
            <X className="w-4 h-4 text-gray-400 shrink-0" />
        </div>
    );
    return (
        <div ref={box} className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="O‘quvchini qidiring: ism, username, telefon..." className="form-input pl-9 h-[54px] text-base" autoFocus />
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {isFetching && !data ? <div className="p-3 space-y-2 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-4 rounded bg-gray-200 w-2/3" />)}</div>
                        : <div className="max-h-72 overflow-y-auto">{data?.data?.length ? data.data.map(s => (
                            <button key={s.id} type="button" onClick={() => { onChange(s); setOpen(false); setQ(''); }} className="w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50">
                                <Avatar name={s.name} /><span className="min-w-0"><span className="block text-sm font-semibold text-gray-900 truncate">{s.name}</span><span className="block text-xs text-gray-500">{s.username ? `@${s.username}` : ''}{s.phone ? ` · ${fmtPhone(s.phone)}` : ''}</span></span>
                            </button>)) : <p className="px-3 py-3 text-sm text-gray-400">Topilmadi</p>}</div>}
                </div>
            )}
        </div>
    );
}

/* ---------- Chart: foiz dinamikasi (bitta seriya, bitta o'q) ---------- */
function PercentChart({ series, bucket }) {
    const [hover, setHover] = useState(null);
    const W = 760, H = 240, P = { l: 40, r: 16, t: 16, b: 32 };
    const n = series.length;
    if (!n) return <div className="h-60 flex items-center justify-center text-gray-400">Ma’lumot yo‘q</div>;
    const x = i => P.l + (n === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (n - 1));
    const y = v => P.t + (100 - v) * (H - P.t - P.b) / 100;
    const path = series.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s.percentage)}`).join(' ');
    const area = `${path} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    const step = Math.max(1, Math.ceil(n / 8));
    const onMove = e => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) * W / r.width; let best = 0; for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; setHover(best); };

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                {[0, 25, 50, 75, 100].map(v => <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth="1" /><text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{v}%</text></g>)}
                <path d={area} fill={SERIES} opacity="0.08" />
                <path d={path} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {series.map((s, i) => <circle key={i} cx={x(i)} cy={y(s.percentage)} r={hover === i ? 6 : 4} fill={SERIES} stroke="#fff" strokeWidth="2" />)}
                {series.map((s, i) => (i % step === 0 || i === n - 1) && <text key={'l' + i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7280">{fmtDay(s.date)}</text>)}
                {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#9ca3af" strokeDasharray="3 3" />}
            </svg>
            {hover !== null && (
                <div className="absolute top-2 right-3 rounded-lg bg-gray-900 text-white text-sm px-3 py-2 shadow-lg pointer-events-none">
                    <p className="font-semibold">{bucket === 'week' ? `${fmtDay(series[hover].date)} haftasi` : fmtDay(series[hover].date)}</p>
                    <p>To‘g‘ri: <b>{series[hover].percentage}%</b> · {series[hover].attempts} ta test · {series[hover].correct}/{series[hover].correct + series[hover].in_correct}</p>
                </div>
            )}
        </div>
    );
}

/* ---------- Chart: testlar soni (ustunlar) ---------- */
function AttemptsChart({ series, bucket }) {
    const [hover, setHover] = useState(null);
    const W = 760, H = 150, P = { l: 40, r: 16, t: 12, b: 32 };
    const n = series.length;
    if (!n) return null;
    const max = Math.max(1, ...series.map(s => s.attempts));
    const bw = Math.max(4, Math.min(28, ((W - P.l - P.r) / n) - 4));
    const x = i => P.l + (i + 0.5) * (W - P.l - P.r) / n - bw / 2;
    const y = v => P.t + (max - v) * (H - P.t - P.b) / max;
    const step = Math.max(1, Math.ceil(n / 8));
    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseLeave={() => setHover(null)}>
                {[0, max].map(v => <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#e5e7eb" /><text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{v}</text></g>)}
                {series.map((s, i) => <g key={i} onMouseEnter={() => setHover(i)}><rect x={x(i) - 2} y={P.t} width={bw + 4} height={H - P.t - P.b} fill="transparent" /><rect x={x(i)} y={y(s.attempts)} width={bw} height={Math.max(0, y(0) - y(s.attempts))} rx="3" fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.5} /></g>)}
                {series.map((s, i) => (i % step === 0 || i === n - 1) && <text key={'l' + i} x={x(i) + bw / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7280">{fmtDay(s.date)}</text>)}
            </svg>
            {hover !== null && <div className="absolute top-1 right-3 rounded-lg bg-gray-900 text-white text-sm px-3 py-2 shadow-lg pointer-events-none"><b>{series[hover].attempts}</b> ta test · {bucket === 'week' ? `${fmtDay(series[hover].date)} haftasi` : fmtDay(series[hover].date)}</div>}
        </div>
    );
}

/* ---------- Bo'laklar ---------- */
const Big = ({ label, value, sub, tone, icon: Icon }) => (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between"><p className="text-sm font-semibold text-gray-500">{label}</p>{Icon && <Icon className="w-4 h-4 text-gray-300" />}</div>
        <p className="mt-2 text-3xl font-extrabold leading-none" style={tone ? { color: STATUS[tone] } : { color: '#111827' }}>{value}</p>
        {sub && <p className="mt-1.5 text-sm text-gray-500">{sub}</p>}
    </div>
);
const Section = ({ title, icon: Icon, right, children }) => (
    <section className="card p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">{Icon && <Icon className="w-5 h-5 text-gray-400" />}{title}</h2>{right}</div>
        {children}
    </section>
);
const ThemeBar = ({ t }) => (
    <div className="flex items-center gap-3">
        <span className="w-7 text-lg text-center shrink-0">{t.icon ?? '•'}</span>
        <span className="flex-1 min-w-0">
            <span className="flex items-center justify-between gap-2 text-sm"><span className="font-semibold text-gray-900 truncate">{t.title}</span><span className="text-gray-500 shrink-0">{t.attempts} ta · {t.correct}/{t.correct + t.in_correct}</span></span>
            <span className="mt-1 block h-2.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${t.percentage}%`, background: STATUS[pctTone(t.percentage)] }} /></span>
        </span>
        <span className="w-14 text-right text-base font-bold shrink-0" style={{ color: STATUS[pctTone(t.percentage)] }}>{t.percentage}%</span>
    </div>
);

/* ---------- Sahifa ---------- */
export default function StudentReport() {
    const [student, setStudent] = useState(null);
    const [range, setRange] = useState({ from: '', to: '' });
    const [params, setParams] = useState(null); // hisobot qurilgan parametrlar
    const { data: rangeInfo } = useQuery({ queryKey: ['/results/report/range', student?.id], queryFn: () => api.get(`/results/report/${student.id}/range`).then(r => r.data), enabled: !!student });
    useEffect(() => { if (rangeInfo) setRange({ from: rangeInfo.first_result_at, to: rangeInfo.today }); }, [rangeInfo]);
    useEffect(() => { setParams(null); }, [student?.id]);

    const { data: R, isFetching, error } = useQuery({
        queryKey: ['/results/report', params],
        queryFn: () => api.get(`/results/report/${params.id}`, { params: { from: params.from, to: params.to } }).then(r => r.data),
        enabled: !!params, staleTime: 5 * 60_000,
    });
    const build = () => student && range.from && range.to && setParams({ id: student.id, from: range.from, to: range.to });
    const v = R?.verdict; const t = R?.totals;
    const trendIcon = v?.trend > 3 ? TrendingUp : v?.trend < -3 ? TrendingDown : null;

    return (
        <>
            <PageHeader title="O‘quvchi hisoboti" />

            {/* Hisobot parametrlari */}
            <div className="card p-5 mb-5">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1" style={{ minWidth: '20rem' }}><label className="form-label">O‘quvchi</label><StudentPicker value={student} onChange={setStudent} /></div>
                    <div><label className="form-label">Dan</label><DateInput value={range.from} onChange={v => setRange(r => ({ ...r, from: v }))} maxDate={range.to} className="w-44" /></div>
                    <div><label className="form-label">Gacha</label><DateInput value={range.to} onChange={v => setRange(r => ({ ...r, to: v }))} minDate={range.from} className="w-44" /></div>
                    <button type="button" onClick={build} disabled={!student || !range.from || !range.to || isFetching} className="btn-primary px-6 text-base disabled:opacity-50" style={{ height: 54 }}>
                        {isFetching ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />} Hisobot qurish
                    </button>
                </div>
                {student && rangeInfo && !params && <p className="mt-3 text-sm text-gray-500">Birinchi natija: {fmtDate(rangeInfo.first_result_at).slice(0, 10)}. Davrni o‘zgartirib "Hisobot qurish"ni bosing.</p>}
                {error && <p className="mt-3 text-sm text-red-600">{messageOf(error)}</p>}
            </div>

            {isFetching && !R && (
                <div className="space-y-5 animate-pulse">
                    <div className="card h-40" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}</div><div className="card h-72" />
                </div>
            )}

            {R && (
                <div className={cx('space-y-5', isFetching && 'opacity-60')}>
                    {/* 1. Xulosa kartasi */}
                    {(() => {
                        const levelTone = { excellent: 'good', good: 'warning', fair: 'serious', weak: 'critical', none: 'critical' }[v.level.key];
                        const readyTone = { ready: 'good', almost: 'warning', not_ready: 'critical', unknown: 'serious' }[v.readiness.key];
                        const actTone = { high: 'good', mid: 'warning', low: 'critical', none: 'critical' }[v.activity.key];
                        const Verdict = ({ title, value, hint, tone, big }) => (
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center gap-4">
                                <span className="h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold" style={{ background: STATUS[tone] }}>{big}</span>
                                <span className="min-w-0">
                                    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</span>
                                    <span className="block text-xl font-extrabold leading-tight" style={{ color: STATUS[tone] }}>{value}</span>
                                    <span className="block text-sm text-gray-500 mt-0.5">{hint}</span>
                                </span>
                            </div>
                        );
                        return (
                            <section className="card p-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <Avatar name={R.student.name} size="w-14 h-14 text-xl" />
                                        <div className="min-w-0">
                                            <p className="text-2xl font-extrabold text-gray-900 truncate"><Link to={`/admin/students/${R.student.id}`} className="hover:text-blue-600">{R.student.name}</Link></p>
                                            <p className="text-sm text-gray-500">{R.student.username ? `@${R.student.username}` : ''}{R.student.phone ? ` · ${fmtPhone(R.student.phone)}` : ''}</p>
                                        </div>
                                        <GroupChips groups={R.student.groups} empty="" />
                                    </div>
                                    <div className="rounded-xl bg-gray-50 px-4 py-2 text-right">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hisobot davri</p>
                                        <p className="text-base font-bold text-gray-900">{fmtDate(R.period.from).slice(0, 10)} — {fmtDate(R.period.to).slice(0, 10)} <span className="text-gray-400 font-medium">· {R.period.days} kun</span></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
                                    <Verdict title="Daraja" value={v.level.label} hint={`To‘g‘ri javoblar ${t.percentage}%`} tone={levelTone} big={v.level.grade} />
                                    <Verdict title="Imtihonga tayyorlik" value={v.readiness.label} hint={v.readiness.hint} tone={readyTone} big={<FileQuestion className="w-7 h-7" />} />
                                    <Verdict title="Faollik" value={v.activity.label} hint={v.trend === null ? `${t.active_days} / ${R.period.days} kun faol` : v.trend > 3 ? `Natija +${v.trend}% yaxshilandi` : v.trend < -3 ? `Natija ${v.trend}% pasaydi` : 'Natija barqaror'} tone={actTone} big={<Activity className="w-7 h-7" />} />
                                </div>

                                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                    {R.summary.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0 md:[&:nth-last-child(2)]:border-0">
                                            <span className="text-base text-gray-600">{s.label}</span>
                                            <span className="text-right min-w-0">
                                                <span className="block text-base font-bold truncate" style={{ color: s.tone ? STATUS[s.tone] : '#111827' }}>{s.value}</span>
                                                {s.hint && <span className="block text-sm text-gray-400">{s.hint}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })()}

                    {/* 2. Asosiy raqamlar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Big label="To‘g‘ri javoblar" value={`${t.percentage}%`} sub={`${t.correct} / ${t.questions} savol`} tone={pctTone(t.percentage)} icon={Target} />
                        <Big label="Yechilgan testlar" value={t.attempts} sub={`${t.exams} imtihon · ${t.hw_attempts} vazifa · ${t.free_attempts} mashg‘ulot`} icon={BookOpen} />
                        <Big label="Faol kunlar" value={`${t.active_days} / ${R.period.days}`} sub={`${t.active_share}% kunlarda · kuniga ${t.per_active_day} ta test`} icon={Activity} />
                        <Big label="Eng uzun davomiylik" value={`${t.best_streak} kun`} sub={t.current_streak ? `Hozir ${t.current_streak} kun ketma-ket` : 'Hozir uzilgan'} icon={Flame} />
                    </div>

                    {/* 3. Dinamika */}
                    <Section title="Natija dinamikasi" icon={TrendingUp} right={<span className="text-sm text-gray-500">{R.period.bucket === 'week' ? 'Haftalik' : 'Kunlik'} · to‘g‘ri javoblar foizi</span>}>
                        <PercentChart series={R.series} bucket={R.period.bucket} />
                        <p className="mt-4 mb-1 text-sm font-semibold text-gray-500">Yechilgan testlar soni</p>
                        <AttemptsChart series={R.series} bucket={R.period.bucket} />
                    </Section>

                    {/* 4. Imtihon + vazifa */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <Section title="Imtihonlar (20 / 50 talik)" icon={FileQuestion}>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center"><p className="text-2xl font-extrabold text-gray-900">{t.exams}</p><p className="text-xs font-semibold text-gray-500 mt-1">Jami</p></div>
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center"><p className="text-2xl font-extrabold" style={{ color: STATUS.good }}>{t.exams_passed}</p><p className="text-xs font-semibold text-gray-500 mt-1">O‘tdi</p></div>
                                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center"><p className="text-2xl font-extrabold" style={{ color: STATUS[pctTone(t.exam_percentage)] }}>{t.exam_percentage}%</p><p className="text-xs font-semibold text-gray-500 mt-1">To‘g‘ri</p></div>
                            </div>
                            {R.last_exams.length ? <>
                                <p className="text-sm font-semibold text-gray-500 mb-2">Oxirgi {R.last_exams.length} ta imtihon</p>
                                <div className="flex items-end gap-1.5 h-20">{R.last_exams.map((e, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${fmtDate(e.created_at)} · ${e.percentage}%`}><div className="w-full rounded-t" style={{ height: `${Math.max(6, e.percentage * 0.6)}px`, background: e.is_passed ? STATUS.good : STATUS.critical }} /><span className="text-[10px] text-gray-500">{e.type === '50_TALIK' ? '50' : '20'}</span></div>)}</div>
                                <p className="mt-1 text-xs text-gray-400">Yashil — o‘tdi, qizil — o‘ta olmadi. Balandlik — to‘g‘ri javob foizi.</p>
                            </> : <p className="text-sm text-gray-400">Davrda imtihon topshirmagan.</p>}
                        </Section>
                        <Section title="Uyga vazifalar va jarima" icon={ClipboardList}>
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                <div className="rounded-xl bg-gray-50 px-3 py-3 text-center"><p className="text-2xl font-extrabold text-gray-900">{R.homeworks.total}</p><p className="text-xs font-semibold text-gray-500 mt-1">Jami</p></div>
                                <div className="rounded-xl bg-gray-50 px-3 py-3 text-center"><p className="text-2xl font-extrabold" style={{ color: STATUS.good }}>{R.homeworks.passed}</p><p className="text-xs font-semibold text-gray-500 mt-1">Bajarildi</p></div>
                                <div className="rounded-xl bg-gray-50 px-3 py-3 text-center"><p className="text-2xl font-extrabold" style={{ color: STATUS.critical }}>{R.homeworks.failed}</p><p className="text-xs font-semibold text-gray-500 mt-1">Bajarilmadi</p></div>
                                <div className={cx('rounded-xl px-3 py-3 text-center', R.homeworks.penalty_points ? 'bg-red-50' : 'bg-gray-50')}><p className="text-2xl font-extrabold" style={{ color: R.homeworks.penalty_points ? STATUS.critical : '#111827' }}>{R.homeworks.penalty_points}</p><p className="text-xs font-semibold text-gray-500 mt-1">Jarima</p></div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">Qolgan imkoniyat: <b className={cx(R.student.blocked ? 'text-red-600' : 'text-gray-900')}>{R.homeworks.attempts_left}</b>{R.student.blocked && <Badge color="red" className="ml-2">Bloklangan</Badge>}</p>
                            {R.penalties.length ? <div className="space-y-2">{R.penalties.map((p, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-2.5 text-sm">
                                    <span className="min-w-0"><span className="block font-semibold text-gray-900 truncate">{p.title}</span><span className="block text-xs text-gray-500 truncate">{p.theme} · {fmtDate(p.end_date).slice(0, 10)}</span></span>
                                    <span className="text-right shrink-0"><span className="block font-bold text-red-700">{p.percentage}% / {p.tests_count} test</span><span className="block text-xs text-gray-500">kerak: {p.passing_percentage}% / {p.min_test_count}</span></span>
                                </div>))}</div> : <p className="text-sm text-gray-400">Davrda jarima yo‘q.</p>}
                        </Section>
                    </div>

                    {/* 6. Barcha bo'limlar — yechilmaganlari ham */}
                    <Section title="Barcha bo‘limlar" icon={BookOpen} right={<span className="text-sm text-gray-500">{R.all_themes.filter(x => x.attempts).length} ta yechilgan · {R.all_themes.filter(x => !x.attempts).length} ta yechilmagan</span>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {R.all_themes.map(x => (
                                <div key={x.id} className={cx('rounded-xl border px-4 py-3 flex items-center gap-3', x.attempts ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50')}>
                                    <span className="w-8 text-xl text-center shrink-0">{x.icon ?? '•'}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className={cx('block text-base font-semibold truncate', x.attempts ? 'text-gray-900' : 'text-gray-500')}>{x.title}</span>
                                        <span className="block text-sm text-gray-500">{x.attempts ? `${x.attempts} ta test · ${x.correct} / ${x.correct + x.in_correct} to‘g‘ri` : 'Yechilmagan'}</span>
                                    </span>
                                    {x.attempts ? <span className="text-xl font-extrabold shrink-0" style={{ color: STATUS[pctTone(x.percentage)] }}>{x.percentage}%</span> : <span className="text-xl font-extrabold text-gray-300 shrink-0">—</span>}
                                </div>
                            ))}
                        </div>
                    </Section>
                    {/* 5. Mavzular */}
                    <Section title="Bo‘limlar bo‘yicha" icon={Award} right={<span className="text-sm text-gray-500">{t.themes_touched} / {t.themes_total} bo‘lim yechilgan</span>}>
                        {R.themes.length ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4">
                                <div><p className="text-sm font-semibold mb-3" style={{ color: STATUS.good }}>Kuchli bo‘limlar</p><div className="space-y-3">{R.strong_themes.map(x => <ThemeBar key={x.id} t={x} />)}</div></div>
                                <div><p className="text-sm font-semibold mb-3" style={{ color: STATUS.critical }}>Zaif bo‘limlar</p><div className="space-y-3">{R.weak_themes.map(x => <ThemeBar key={x.id} t={x} />)}</div></div>
                                {R.themes.length > 5 && <div className="lg:col-span-2 mt-2"><p className="text-sm font-semibold text-gray-500 mb-3">Barcha yechilgan bo‘limlar</p><div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-3">{R.themes.map(x => <ThemeBar key={x.id} t={x} />)}</div></div>}
                            </div>
                        ) : <p className="text-sm text-gray-400">Davrda bo‘lim testlari yechilmagan.</p>}
                    </Section>

                </div>
            )}

            {!R && !isFetching && !student && (
                <div className="card p-12 text-center text-gray-400"><Search className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p className="text-base">O‘quvchini tanlang, davrni belgilang va "Hisobot qurish"ni bosing.</p></div>
            )}
        </>
    );
}

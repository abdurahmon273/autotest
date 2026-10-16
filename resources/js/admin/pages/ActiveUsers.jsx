import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarDays, ClipboardList, MoonStar, Send, UserPlus, Users, Wifi } from 'lucide-react';
import api from '../api';
import DateInput from '../components/DateInput';
import { useAuth } from '../lib/auth';
import { useDebounce, useItem, useList, useListState } from '../lib/hooks';
import { Avatar, GroupChips, PageHeader, SearchInput, SkeletonBlock, Table, Td, Th } from '../components/ui';
import { cx, fmtPhone } from '../lib/utils';

const ymd = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const TODAY = () => ymd(new Date());
const hm = iso => { if (!iso) return null; const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; };
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

/** Oxirgi faollik — odam tilida: "Hozir", "25 daqiqa oldin", "Bugun 14:32", "Kecha 09:10", "3 okt 18:05". */
function ago(iso) {
    if (!iso) return 'Hech qachon';
    const d = new Date(iso), now = new Date();
    const min = Math.floor((now - d) / 60000);
    if (min < 1) return 'Hozir';
    if (min < 60) return `${min} daqiqa oldin`;
    const sameDay = ymd(d) === ymd(now);
    if (sameDay) return `Bugun ${hm(iso)}`;
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (ymd(d) === ymd(y)) return `Kecha ${hm(iso)}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${hm(iso)}`;
}

const STATUSES = [
    ['', 'Barchasi', 'total', 'gray'],
    ['online', 'Hozir onlayn', 'online', 'green'],
    ['active', 'Faol', 'active', 'blue'],
    ['inactive', 'Kirmagan', 'inactive', 'red'],
];
const PILL = {
    gray: ['bg-gray-900 text-white', 'bg-white text-gray-700 hover:bg-gray-100'],
    green: ['bg-green-600 text-white', 'bg-white text-green-700 hover:bg-green-50'],
    blue: ['bg-blue-600 text-white', 'bg-white text-blue-700 hover:bg-blue-50'],
    red: ['bg-red-600 text-white', 'bg-white text-red-700 hover:bg-red-50'],
};

function Tile({ label, value, Icon, tone, hint }) {
    const tones = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600', gray: 'bg-gray-100 text-gray-600' };
    return (
        <div className="card p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
                {value === undefined ? <SkeletonBlock className="h-10 w-20" /> : <p className="text-4xl font-extrabold text-gray-900 tabular-nums leading-none">{value}</p>}
                <p className="mt-2 text-base font-semibold text-gray-600">{label}</p>
                {hint && <p className="text-sm text-gray-400">{hint}</p>}
            </div>
            <div className={cx('h-14 w-14 rounded-2xl flex items-center justify-center shrink-0', tones[tone])}><Icon className="h-7 w-7" /></div>
        </div>
    );
}

/** Soatlar bo'yicha faollik: 24 ustun, hover da aniq son. Katta va sodda. */
function Hours({ hours, isToday }) {
    const [hover, setHover] = useState(null);
    const max = Math.max(1, ...hours.map(h => h.answers));
    const nowH = new Date().getHours();
    const total = hours.reduce((s, h) => s + h.answers, 0);
    return (
        <div className="card p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Soatlar bo‘yicha faollik</h3>
                <p className="text-base text-gray-500"><span className="text-2xl font-extrabold text-gray-900 tabular-nums">{total}</span> javob</p>
            </div>
            {total === 0 ? <p className="py-10 text-center text-base text-gray-400">Bu kunda faollik bo‘lmagan</p> : (
                <div className="relative">
                    {hover !== null && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 text-white text-sm font-medium px-3 py-1.5 pointer-events-none">
                            {String(hover).padStart(2, '0')}:00 — {hours[hover].answers} javob, {hours[hover].users} o‘quvchi
                        </div>
                    )}
                    <div className="flex items-end gap-1 h-44 pt-8" onMouseLeave={() => setHover(null)}>
                        {hours.map(h => {
                            const future = isToday && h.hour > nowH;
                            return (
                                <div key={h.hour} className="flex-1 h-full flex flex-col justify-end items-center cursor-default" onMouseEnter={() => setHover(h.hour)}>
                                    <div className={cx('w-full rounded-t-md transition-colors', future ? 'bg-gray-50' : h.answers ? (hover === h.hour ? 'bg-blue-700' : 'bg-blue-500') : 'bg-gray-100')} style={{ height: `${Math.max(h.answers ? 6 : 2, (h.answers / max) * 100)}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-1 mt-2">
                        {hours.map(h => <div key={h.hour} className={cx('flex-1 text-center text-xs tabular-nums', h.hour % 3 === 0 ? 'text-gray-500 font-medium' : 'text-transparent')}>{String(h.hour).padStart(2, '0')}</div>)}
                    </div>
                </div>
            )}
        </div>
    );
}

function Status({ s }) {
    const [cls, dot, text] = s.online ? ['bg-green-50 text-green-700', 'bg-green-500', 'Onlayn'] : s.active ? ['bg-blue-50 text-blue-700', 'bg-blue-500', 'Faol'] : ['bg-gray-100 text-gray-500', 'bg-gray-400', 'Kirmagan'];
    return <span className={cx('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-base font-semibold', cls)}><span className={cx('h-2.5 w-2.5 rounded-full', dot, s.online && 'animate-pulse')} />{text}</span>;
}

export default function ActiveUsers() {
    const { can } = useAuth();
    const [{ date, status, group_id, search, page }, setState] = useListState({ date: TODAY(), status: '', group_id: '', search: '', page: 1 });
    const q = useDebounce(search, 200).trim();
    const params = { date, status, group_id, search: q.length >= 2 ? q : '', page };
    const { data: stats } = useQuery({ queryKey: ['/active-users/stats', date, group_id], queryFn: () => api.get('/active-users/stats', { params: { date, group_id } }).then(r => r.data), placeholderData: p => p, refetchInterval: date === TODAY() ? 60_000 : false });
    const { data, isFetching } = useList('/active-users', params);
    const { data: groups } = useItem('/active-users/groups');
    const isToday = date === TODAY();
    const dayLabel = isToday ? 'Bugun' : date;

    return (
        <>
            <PageHeader title="Faol foydalanuvchilar">
                <DateInput value={date} onChange={v => setState('date', v || TODAY())} maxDate={TODAY()} className="w-44" />
                <button type="button" onClick={() => setState('date', TODAY())} className={cx('btn-secondary px-4', isToday && 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800')}>Bugun</button>
                <select value={group_id} onChange={e => setState('group_id', e.target.value)} className="form-input w-48">
                    <option value="">Barcha guruhlar</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <SearchInput value={search} onChange={v => setState('search', v)} placeholder="O‘quvchi qidirish..." loading={isFetching && q.length >= 2} />
            </PageHeader>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <Tile label="Hozir onlayn" hint="So‘nggi 5 daqiqada" value={stats?.online} Icon={Wifi} tone="green" />
                <Tile label={`${dayLabel} faol`} hint="Test ishlagan yoki kirgan" value={stats?.active} Icon={Activity} tone="blue" />
                <Tile label={`${dayLabel} kirmagan`} hint={stats ? `${stats.total} o‘quvchidan` : undefined} value={stats?.inactive} Icon={MoonStar} tone="red" />
                <Tile label={`${dayLabel} testlar`} hint={stats ? `${stats.answers} ta javob` : undefined} value={stats?.tests} Icon={ClipboardList} tone="amber" />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <Tile label="Jami o‘quvchilar" value={stats?.total} Icon={Users} tone="gray" />
                <Tile label={`${dayLabel} qo‘shilgan`} hint="Yangi o‘quvchilar" value={stats?.new_students} Icon={UserPlus} tone="purple" />
                <Tile label="Telegram ulangan" hint={stats ? `${stats.total ? Math.round((stats.telegram / stats.total) * 100) : 0}% o‘quvchi` : undefined} value={stats?.telegram} Icon={Send} tone="blue" />
                <Tile label="Eng gavjum soat" value={stats ? (stats.peak_hour === null ? '—' : `${String(stats.peak_hour).padStart(2, '0')}:00`) : undefined} Icon={CalendarDays} tone="amber" />
            </div>

            <div className="mb-6">{stats ? <Hours hours={stats.hours} isToday={isToday} /> : <div className="card h-64 animate-pulse" />}</div>

            <div className="flex flex-wrap gap-2 mb-4">
                {STATUSES.map(([v, label, key, tone]) => (
                    <button key={v} type="button" onClick={() => setState('status', v)}
                        className={cx('inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-base font-semibold transition-colors', PILL[tone][status === v ? 0 : 1])}>
                        {label}
                        {stats && <span className={cx('rounded-md px-2 py-0.5 text-sm tabular-nums', status === v ? 'bg-white/20' : 'bg-gray-100 text-gray-700')}>{stats[key]}</span>}
                    </button>
                ))}
            </div>

            <Table cols={6} loading={isFetching && !data} rows={data?.data} meta={data} onPage={p => setState({ page: p })}
                head={<><Th>O‘quvchi</Th><Th>Guruh</Th><Th>Holat</Th><Th>{dayLabel} kirdi</Th><Th>Oxirgi faollik</Th><Th className="text-right">{dayLabel} testlar</Th></>}
                render={s => (
                    <tr key={s.id} className={cx('hover:bg-gray-50', !s.active && 'text-gray-500')}>
                        <Td>
                            <div className="flex items-center gap-3">
                                <Avatar name={s.name} size="w-11 h-11 text-base" />
                                <div className="min-w-0">
                                    <p className="text-base font-semibold text-gray-900 truncate">{can('show_student') ? <Link to={`/admin/students/${s.id}`} className="hover:text-blue-600">{s.name}</Link> : s.name}{s.blocked && <span className="ml-2 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">Bloklangan</span>}</p>
                                    <p className="text-sm text-gray-500">{fmtPhone(s.phone)}{s.telegram && <span className="ml-2 text-blue-500">Telegram</span>}</p>
                                </div>
                            </div>
                        </Td>
                        <Td><GroupChips groups={s.groups} /></Td>
                        <Td><Status s={s} /></Td>
                        <Td className="text-base tabular-nums">{s.day_first ? <>{hm(s.day_first)}{s.day_last && s.day_last !== s.day_first && <span className="text-gray-400"> — {hm(s.day_last)}</span>}</> : s.active ? <span className="text-gray-400">Kirgan</span> : <span className="text-gray-300">—</span>}</Td>
                        <Td className={cx('text-base', s.online ? 'text-green-700 font-semibold' : 'text-gray-600')}>{s.online ? 'Hozir' : ago(s.last_seen)}</Td>
                        <Td className="text-right"><span className={cx('text-2xl font-extrabold tabular-nums', s.day_tests ? 'text-gray-900' : 'text-gray-300')}>{s.day_tests}</span>{s.day_answers > 0 && <span className="ml-2 text-sm text-gray-400">{s.day_answers} javob</span>}</Td>
                    </tr>
                )} />
        </>
    );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import DateInput from '../components/DateInput';
import { Briefcase, GraduationCap, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Empty, PageHeader, SkeletonBlock, SkeletonRows, Td, Th, THead } from '../components/ui';
import LineChart from '../components/LineChart';
import BarChart from '../components/BarChart';
import { cx, fmtDate, fmtPhone } from '../lib/utils';

const ymd = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const DEFAULT_RANGE = () => { const to = new Date(); const from = new Date(to); from.setMonth(from.getMonth() - 2); return { from: ymd(from), to: ymd(to) }; };

const ChartSkeleton = ({ className = 'h-72' }) => (
    <div className={cx('card p-5 animate-pulse', className)}>
        <div className="h-4 w-48 rounded bg-gray-200 mb-6" />
        <div className="h-[calc(100%-2.5rem)] rounded-lg bg-gray-100" />
    </div>
);

function HomeworkCoverage({ data }) {
    const color = data.percent >= 70 ? '#16a34a' : data.percent >= 40 ? '#d97706' : '#dc2626';
    const maxTasks = Math.max(1, ...data.groups.map(g => g.tasks));
    return (
        <div className="card p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="text-base font-semibold text-gray-900">Guruhlarga vazifa berilishi</h3>
                <p className="text-3xl font-extrabold tabular-nums" style={{ color }}>{data.percent}%</p>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden mb-5"><div className="h-full rounded-full" style={{ width: `${data.percent}%`, background: color }} /></div>
            {data.groups.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                    {data.groups.map(g => (
                        <div key={g.id} className="flex items-center gap-3">
                            <span className="w-44 truncate text-base text-gray-800">{g.name}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(g.tasks / maxTasks) * 100}%`, background: g.tasks ? '#16a34a' : 'transparent' }} /></div>
                            <span className={cx('w-8 text-right text-base font-bold tabular-nums', g.tasks ? 'text-gray-900' : 'text-gray-300')}>{g.tasks}</span>
                        </div>
                    ))}
                </div>
            ) : <p className="text-base text-gray-400">Guruhlar yo‘q</p>}
        </div>
    );
}

export default function Dashboard() {
    const [range, setRange] = useState(DEFAULT_RANGE);
    const { data, isLoading } = useQuery({ queryKey: ['/dashboard', range], queryFn: () => api.get('/dashboard', { params: range }).then(r => r.data), placeholderData: p => p });
    const { data: charts } = useQuery({ queryKey: ['/dashboard/charts', range], queryFn: () => api.get('/dashboard/charts', { params: range }).then(r => r.data), enabled: !!data });
    const { can } = useAuth();
    const cards = [
        ['Ustozlar', data?.stats.teachers, GraduationCap],
        ['Studentlar', data?.stats.students, Users],
        ['Yangi studentlar', data?.stats.newStudents, UserPlus],
        ['Hodimlar', data?.stats.staff, Briefcase],
    ];

    return (
        <>
            <PageHeader title="Dashboard">
                <DateInput value={range.from} onChange={v => setRange(r => ({ ...r, from: v }))} maxDate={range.to} placeholder="Boshlanish" className="w-40" />
                <span className="text-gray-400">—</span>
                <DateInput value={range.to} onChange={v => setRange(r => ({ ...r, to: v }))} minDate={range.from} placeholder="Tugash" className="w-40" />
                <button type="button" onClick={() => setRange(DEFAULT_RANGE())} className="btn-secondary px-3">2 oy</button>
            </PageHeader>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {cards.map(([label, value, Icon]) => (
                    <div key={label} className="card p-5 flex items-center justify-between">
                        <div>
                            {isLoading ? <SkeletonBlock className="h-9 w-16" /> : <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{value}</p>}
                            <p className="mt-1 text-sm font-medium text-gray-500">{label}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center"><Icon className="h-6 w-6 text-blue-600" /></div>
                    </div>
                ))}
            </div>

            <div className="space-y-6 mb-6">
                {charts ? <LineChart title="Yechilgan testlar" data={charts.activity} colors={['#16a34a']} series={[{ key: 'answers', label: 'Yechilgan testlar' }]} /> : <ChartSkeleton className="h-80" />}
                {charts ? <HomeworkCoverage data={charts.homework} /> : <ChartSkeleton className="h-48" />}
                {charts ? <BarChart title="Mavzular bo‘yicha vazifa olgan guruhlar ulushi" data={charts.homework.themes.map(t => ({ id: t.id, label: t.title, value: t.percent, hint: `${t.groups} / ${charts.homework.total} guruh` }))} /> : <ChartSkeleton className="h-80" />}
            </div>

            <div className="card">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">So‘nggi studentlar</h3>
                    {can('access_student') && <Link to="/admin/students" className="text-sm font-medium text-blue-600 hover:underline">Barchasi</Link>}
                </div>
                <table className="min-w-full">
                    <THead><Th>Ism</Th><Th>Telefon</Th><Th>Sana</Th></THead>
                    <tbody className="table-body">
                        {isLoading ? <SkeletonRows cols={3} rows={5} /> : data.recent.length ? data.recent.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50"><Td className="text-base font-medium text-gray-900">{s.name}</Td><Td className="text-base">{fmtPhone(s.phone)}</Td><Td className="text-gray-500">{fmtDate(s.created_at).slice(0, 10)}</Td></tr>
                        )) : <Empty colSpan={3} />}
                    </tbody>
                </table>
            </div>
        </>
    );
}

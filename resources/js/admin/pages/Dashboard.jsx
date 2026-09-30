import { Link } from 'react-router-dom';
import { Briefcase, GraduationCap, UserPlus, Users } from 'lucide-react';
import { useItem } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Empty, PageHeader, SkeletonBlock, SkeletonRows, Td, Th, THead } from '../components/ui';
import { fmtDate, fmtPhone } from '../lib/utils';

export default function Dashboard() {
    const { data, isLoading } = useItem('/dashboard');
    const { can } = useAuth();
    const cards = [
        ['Ustozlar', data?.stats.teachers, GraduationCap],
        ['Studentlar', data?.stats.students, Users],
        ['Yangi studentlar (shu oy)', data?.stats.newStudents, UserPlus],
        ['Hodimlar', data?.stats.staff, Briefcase],
    ];

    return (
        <>
            <PageHeader title="Dashboard" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {cards.map(([label, value, Icon]) => (
                    <div key={label} className="card p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{label}</p>
                            {isLoading ? <SkeletonBlock className="h-7 w-12 mt-1" /> : <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>}
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><Icon className="h-5 w-5 text-blue-600" /></div>
                    </div>
                ))}
            </div>
            <div className="card">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">So‘nggi studentlar</h3>
                    {can('access_student') && <Link to="/admin/students" className="text-sm text-blue-600 hover:underline">Barchasi</Link>}
                </div>
                <table className="min-w-full">
                    <THead><Th>To‘liq ism</Th><Th>Telefon</Th><Th>Yaratilgan sana</Th></THead>
                    <tbody className="table-body">
                        {isLoading ? <SkeletonRows cols={3} rows={5} /> : data.recent.length ? data.recent.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50"><Td className="font-medium text-gray-900">{s.name}</Td><Td>{fmtPhone(s.phone)}</Td><Td className="text-gray-500">{fmtDate(s.created_at)}</Td></tr>
                        )) : <Empty colSpan={3} />}
                    </tbody>
                </table>
            </div>
        </>
    );
}

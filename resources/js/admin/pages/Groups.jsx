import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen, UserPlus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { Actions, BackLink, Empty, Field, Input, PageHeader, SaveButton, SearchInput, Table, Td, Th, THead } from '../components/ui';
import GroupStudents from '../components/GroupStudents';
import StudentPicker from '../components/StudentPicker';
import { fmtDate, fmtPhone } from '../lib/utils';

export function GroupsIndex() {
    const { can } = useAuth();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pickFor, setPickFor] = useState(null);
    const q = useDebounce(search);
    const { data, isFetching } = useList('/groups', { search: q, page });
    const del = useDelete('/groups');

    return (
        <>
            <PageHeader title="Guruhlar">
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Guruh qidirish..." />
                {can('create_group') && <Link to="/admin/groups/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={6} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th className="w-12">#</Th><Th>Nomi</Th><Th>Tasnif</Th><Th>Studentlar</Th><Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={g => (
                    <tr key={g.id} className="hover:bg-gray-50">
                        <Td className="text-gray-400">{g.id}</Td>
                        <Td className="font-medium text-gray-900">{can('show_group') ? <Link to={`/admin/groups/${g.id}`} className="hover:text-blue-600">{g.name}</Link> : g.name}</Td>
                        <Td className="text-gray-500">{g.description ?? '—'}</Td>
                        <Td>{g.students_count}</Td>
                        <Td className="text-gray-500">{fmtDate(g.created_at)}</Td>
                        <Td><Actions show={can('show_group') && `/admin/groups/${g.id}`} edit={can('update_group') && `/admin/groups/${g.id}/edit`}
                            extra={can('update_group') && <button type="button" onClick={() => setPickFor(g.id)} className="icon-btn text-green-600 hover:text-green-700 hover:bg-green-50" title="Student qo‘shish"><UserPlus className="w-4 h-4" /></button>}
                            onDelete={can('delete_group') && (() => del(`/groups/${g.id}`, `${g.name} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
            <StudentPicker open={!!pickFor} onClose={() => setPickFor(null)} groupId={pickFor} onAdded={() => qc.invalidateQueries({ queryKey: ['/groups'] })} />
        </>
    );
}

export function GroupForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const { data } = useItem(`/groups/${id}`, !!id);
    const [form, setForm] = useState(null);
    const [students, setStudents] = useState([]);
    const { save, saving, errors } = useSave({ onSuccess: () => nav('/admin/groups'), invalidate: ['/groups', `/groups/${id}`] });
    const f = form ?? { name: data?.name ?? '', description: data?.description ?? '', telegram_chat_id: data?.telegram_chat_id ?? '' };
    const set = (k, v) => setForm({ ...f, [k]: v });
    if (id && !data) return null;

    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: id ? 'put' : 'post', url: id ? `/groups/${id}` : '/groups', data: { ...f, students } }); }}>
            <PageHeader title={id ? 'Guruhni tahrirlash' : 'Guruh qo‘shish'}>
                <Link to="/admin/groups" className="btn-secondary">Bekor qilish</Link>
                <SaveButton saving={saving} />
            </PageHeader>
            <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Field label="Nomi" error={errors.name}><Input value={f.name} onChange={e => set('name', e.target.value)} required /></Field>
                    <Field label="Tasnif" error={errors.description}><Input value={f.description} onChange={e => set('description', e.target.value)} /></Field>
                    <Field label="Telegram guruh ID" hint="(masalan -1001234567890)" error={errors.telegram_chat_id}><Input value={f.telegram_chat_id ?? ''} onChange={e => set('telegram_chat_id', e.target.value)} placeholder="-100..." /></Field>
                </div>
            </div>
            <div className="mt-5">
                <GroupStudents groupId={id ? Number(id) : null} selected={students} onChange={setStudents} />
                {errors.students && <span className="text-red-600 text-xs">{errors.students[0]}</span>}
            </div>
        </form>
    );
}

export function GroupShow() {
    const { id } = useParams();
    const { can } = useAuth();
    const { data: g } = useItem(`/groups/${id}`);
    if (!g) return null;

    return (
        <>
            <PageHeader title={g.name}>
                <BackLink to="/admin/groups" />
                {can('update_group') && <Link to={`/admin/groups/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
            </PageHeader>
            {g.description && <p className="-mt-3 mb-5 text-sm text-gray-500">{g.description}</p>}
            <div className="card">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-900">Studentlar</h3><span className="text-xs text-gray-400">{g.students.length} ta</span></div>
                <table className="min-w-full">
                    <THead><Th>To‘liq ism</Th><Th>Telefon</Th><Th>Yaratilgan sana</Th></THead>
                    <tbody className="table-body">
                        {g.students.length ? g.students.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <Td className="font-medium text-gray-900">{can('show_student') ? <Link to={`/admin/students/${s.id}`} className="hover:text-blue-600">{s.name}</Link> : s.name}</Td>
                                <Td>{fmtPhone(s.phone)}</Td><Td className="text-gray-500">{fmtDate(s.created_at)}</Td>
                            </tr>
                        )) : <Empty colSpan={3} />}
                    </tbody>
                </table>
            </div>
        </>
    );
}

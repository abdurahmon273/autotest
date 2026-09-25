import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, SquarePen } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { Actions, BackLink, Badge, Field, Input, PageHeader, SaveButton, SearchInput, Table, Th, Td } from '../components/ui';
import { PERMISSION_TYPES, fmtDate } from '../lib/utils';

export function PermissionsIndex() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search);
    const { data, isFetching } = useList('/permissions', { search: q, type, page });
    const del = useDelete('/permissions');

    return (
        <>
            <PageHeader title="Ruxsatlar">
                <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="form-input w-40"><option value="">Barcha turlar</option>{Object.entries(PERMISSION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Ruxsat qidirish..." />
                {can('create_permission') && <Link to="/admin/permissions/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={5} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th className="w-12">#</Th><Th>Nomi</Th><Th>Turi</Th><Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                        <Td className="text-gray-400">{p.id}</Td><Td className="font-mono text-xs font-medium text-gray-900">{p.title}</Td><Td><Badge color="gray">{PERMISSION_TYPES[p.type]}</Badge></Td><Td className="text-gray-500">{fmtDate(p.created_at)}</Td>
                        <Td><Actions show={can('show_permission') && `/admin/permissions/${p.id}`} edit={can('update_permission') && `/admin/permissions/${p.id}/edit`} onDelete={can('delete_permission') && (() => del(`/permissions/${p.id}`, `${p.title} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
        </>
    );
}

export function PermissionForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const { data } = useItem(`/permissions/${id}`, !!id);
    const [form, setForm] = useState(null);
    const { save, saving, errors } = useSave({ onSuccess: () => nav('/admin/permissions'), invalidate: ['/permissions', `/permissions/${id}`, '/roles/permissions'] });
    const f = form ?? { title: data?.title ?? '', type: data?.type ?? 4 };
    const set = (k, v) => setForm({ ...f, [k]: v });
    if (id && !data) return null;

    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: id ? 'put' : 'post', url: id ? `/permissions/${id}` : '/permissions', data: f }); }}>
            <PageHeader title={id ? 'Ruxsatni tahrirlash' : 'Ruxsat qo‘shish'}><BackLink to="/admin/permissions" /></PageHeader>
            <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Nomi" error={errors.title}><Input value={f.title} onChange={e => set('title', e.target.value)} className="font-mono" placeholder="access_student" required /></Field>
                    <Field label="Turi" error={errors.type}><select value={f.type} onChange={e => set('type', Number(e.target.value))} className="form-input">{Object.entries(PERMISSION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                </div>
                <div className="mt-6 flex justify-end gap-3"><Link to="/admin/permissions" className="btn-secondary">Bekor qilish</Link><SaveButton saving={saving} /></div>
            </div>
        </form>
    );
}

export function PermissionShow() {
    const { id } = useParams();
    const { can } = useAuth();
    const { data: p } = useItem(`/permissions/${id}`);
    if (!p) return null;

    return (
        <>
            <PageHeader title={p.title}>
                <BackLink to="/admin/permissions" />
                {can('update_permission') && <Link to={`/admin/permissions/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
            </PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Ma’lumot</h3>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between"><dt className="text-gray-500">ID</dt><dd className="font-medium">{p.id}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Nomi</dt><dd className="font-mono font-medium">{p.title}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Turi</dt><dd><Badge>{PERMISSION_TYPES[p.type]}</Badge></dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Yaratilgan</dt><dd className="font-medium">{fmtDate(p.created_at)}</dd></div>
                    </dl>
                </div>
                <div className="card p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Biriktirilgan rollar</h3>
                    {p.roles.length ? <div className="flex flex-wrap gap-2">{p.roles.map(r => can('show_role') ? <Link key={r.id} to={`/admin/roles/${r.id}`}><Badge color="purple">{r.title}</Badge></Link> : <Badge key={r.id} color="purple">{r.title}</Badge>)}</div> : <p className="text-sm text-gray-400">Hech qaysi rolga biriktirilmagan</p>}
                </div>
            </div>
        </>
    );
}

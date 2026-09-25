import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, SquarePen } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { Actions, BackLink, Badge, Empty, Field, Input, PageHeader, SaveButton, SearchInput, Table, Th, Td } from '../components/ui';
import { PERMISSION_TYPES, SYSTEM_ROLES, fmtDate, fmtPhone } from '../lib/utils';

export function RolesIndex() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search);
    const { data, isFetching } = useList('/roles', { search: q, page });
    const del = useDelete('/roles');

    return (
        <>
            <PageHeader title="Rollar">
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Rol qidirish..." />
                {can('create_role') && <Link to="/admin/roles/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={6} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th className="w-12">#</Th><Th>Nomi</Th><Th>Ruxsatlar</Th><Th>Foydalanuvchilar</Th><Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                        <Td className="text-gray-400">{r.id}</Td><Td className="font-medium text-gray-900">{r.title}</Td><Td>{r.permissions_count}</Td><Td>{r.users_count}</Td><Td className="text-gray-500">{fmtDate(r.created_at)}</Td>
                        <Td><Actions show={can('show_role') && `/admin/roles/${r.id}`} edit={can('update_role') && `/admin/roles/${r.id}/edit`} onDelete={can('delete_role') && !SYSTEM_ROLES.includes(r.id) && (() => del(`/roles/${r.id}`, `${r.title} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
        </>
    );
}

export function RoleForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const { data } = useItem(`/roles/${id}`, !!id);
    const { data: all } = useItem('/roles/permissions');
    const [form, setForm] = useState(null);
    const { save, saving, errors } = useSave({ onSuccess: () => nav('/admin/roles'), invalidate: ['/roles', `/roles/${id}`, 'me'] });
    const f = form ?? { title: data?.title ?? '', permissions: data?.permissions.map(p => p.id) ?? [] };
    const set = (k, v) => setForm({ ...f, [k]: v });
    if ((id && !data) || !all) return null;

    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: id ? 'put' : 'post', url: id ? `/roles/${id}` : '/roles', data: f }); }}>
            <PageHeader title={id ? 'Rolni tahrirlash' : 'Rol qo‘shish'}><BackLink to="/admin/roles" /></PageHeader>
            <div className="card p-6">
                <Field label="Nomi" error={errors.title} className="max-w-md"><Input value={f.title} onChange={e => set('title', e.target.value)} required /></Field>
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <label className="form-label mb-0">Ruxsatlar <span className="text-gray-400 font-normal">({all.length})</span></label>
                        <div className="flex gap-2 text-xs">
                            <button type="button" className="text-blue-600 hover:underline" onClick={() => set('permissions', all.map(p => p.id))}>Barchasi</button>
                            <span className="text-gray-300">|</span>
                            <button type="button" className="text-gray-500 hover:underline" onClick={() => set('permissions', [])}>Tozalash</button>
                        </div>
                    </div>
                    {errors.permissions && <span className="text-red-600 text-xs">{errors.permissions[0]}</span>}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px rounded-lg border border-gray-200 bg-gray-200 overflow-hidden">
                        {all.map(p => (
                            <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer bg-white hover:bg-gray-50">
                                <input type="checkbox" checked={f.permissions.includes(p.id)} onChange={e => set('permissions', e.target.checked ? [...f.permissions, p.id] : f.permissions.filter(x => x !== p.id))} className="h-4 w-4 rounded border-gray-300 text-admin-primary focus:ring-admin-primary" />
                                <span className="font-mono text-xs text-gray-800">{p.title}</span>
                                <Badge color="gray" className="ml-auto">{PERMISSION_TYPES[p.type]}</Badge>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3"><Link to="/admin/roles" className="btn-secondary">Bekor qilish</Link><SaveButton saving={saving} /></div>
            </div>
        </form>
    );
}

export function RoleShow() {
    const { id } = useParams();
    const { can } = useAuth();
    const { data: r } = useItem(`/roles/${id}`);
    if (!r) return null;

    return (
        <>
            <PageHeader title={r.title}>
                <BackLink to="/admin/roles" />
                {can('update_role') && <Link to={`/admin/roles/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
            </PageHeader>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Ma’lumot</h3>
                    <dl className="space-y-3 text-sm">
                        {[['ID', r.id], ['Nomi', r.title], ['Ruxsatlar', r.permissions.length], ['Foydalanuvchilar', r.users.length], ['Yaratilgan', fmtDate(r.created_at)]].map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium">{v}</dd></div>)}
                    </dl>
                </div>
                <div className="card p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Ruxsatlar</h3>
                    {r.permissions.length ? <div className="flex flex-wrap gap-2">{r.permissions.map(p => <Badge key={p.id} className="font-mono">{p.title}</Badge>)}</div> : <p className="text-sm text-gray-400">Ruxsatlar biriktirilmagan</p>}
                </div>
                <div className="card lg:col-span-3">
                    <div className="px-5 py-4 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-900">Ushbu roldagi foydalanuvchilar</h3></div>
                    <table className="min-w-full">
                        <thead className="border-b border-gray-200"><tr><Th>To‘liq ism</Th><Th>Email / Telefon</Th><Th>Yaratilgan sana</Th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {r.users.length ? r.users.map(u => <tr key={u.id} className="hover:bg-gray-50"><Td className="font-medium text-gray-900">{u.name}</Td><Td>{u.email ?? fmtPhone(u.phone)}</Td><Td className="text-gray-500">{fmtDate(u.created_at)}</Td></tr>) : <Empty colSpan={3} />}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

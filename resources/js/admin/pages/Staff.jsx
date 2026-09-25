import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, SquarePen } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { Actions, Avatar, BackLink, Badge, Field, Input, PageHeader, SaveButton, SearchInput, Table, Th, Td } from '../components/ui';
import { ROLE_ADMIN, fmtDate, fmtPhone } from '../lib/utils';

const RoleBadge = ({ r }) => <Badge color={r.id === ROLE_ADMIN ? 'blue' : 'gray'}>{r.title}</Badge>;

export const RolesPermissions = ({ roles }) => (
    <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Rollar va ruxsatlar</h3>
        {roles.map(r => (
            <div key={r.id} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2"><RoleBadge r={r} /><span className="text-xs text-gray-400">{r.permissions.length} ta ruxsat</span></div>
                <div className="flex flex-wrap gap-1.5">{r.permissions.map(p => <span key={p} className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600">{p}</span>)}</div>
            </div>
        ))}
    </div>
);

export function StaffIndex() {
    const { can, user } = useAuth();
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search);
    const { data, isFetching } = useList('/staff', { search: q, role, page });
    const { data: roles } = useItem('/staff/roles');
    const del = useDelete('/staff');

    return (
        <>
            <PageHeader title="Hodimlar">
                <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="form-input w-40"><option value="">Barcha rollar</option>{roles?.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Ism, email, telefon, username, Telegram ID..." />
                {can('create_staff') && <Link to="/admin/staff/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={8} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th>To‘liq ism</Th><Th>Email</Th><Th>Telefon</Th><Th>Username</Th><Th>Telegram ID</Th><Th>Rollar</Th><Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                        <Td><div className="flex items-center gap-3"><Avatar name={u.name} /><span className="font-medium text-gray-900">{u.name}</span></div></Td>
                        <Td>{u.email ?? '—'}</Td>
                        <Td>{fmtPhone(u.phone)}</Td>
                        <Td className="text-gray-500">{u.username ?? '—'}</Td>
                        <Td className="text-gray-500">{u.chat_id ?? '—'}</Td>
                        <Td><div className="flex flex-wrap gap-1">{u.roles.map(r => <RoleBadge key={r.id} r={r} />)}</div></Td>
                        <Td className="text-gray-500">{fmtDate(u.created_at)}</Td>
                        <Td><Actions show={can('show_staff') && `/admin/staff/${u.id}`} edit={can('update_staff') && `/admin/staff/${u.id}/edit`} onDelete={can('delete_staff') && u.id !== user.id && (() => del(`/staff/${u.id}`, `${u.name} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
        </>
    );
}

export function StaffForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user } = useAuth();
    const { data } = useItem(`/staff/${id}`, !!id);
    const { data: roles } = useItem('/staff/roles');
    const [form, setForm] = useState(null);
    const { save, saving, errors } = useSave({ onSuccess: () => nav('/admin/staff'), invalidate: ['/staff', `/staff/${id}`, 'me'] });
    const f = form ?? { name: data?.name ?? '', email: data?.email ?? '', phone: data?.phone ?? '', username: data?.username ?? '', chat_id: data?.chat_id ?? '', roles: data?.roles.map(r => r.id) ?? [], password: '', password_confirmation: '' };
    const set = (k, v) => setForm({ ...f, [k]: v });
    if ((id && !data) || !roles) return null;

    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: id ? 'put' : 'post', url: id ? `/staff/${id}` : '/staff', data: f }); }}>
            <PageHeader title={id ? 'Hodimni tahrirlash' : 'Hodim qo‘shish'}><BackLink to="/admin/staff" /></PageHeader>
            <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="To‘liq ism" error={errors.name}><Input value={f.name} onChange={e => set('name', e.target.value)} required /></Field>
                    <Field label="Email" hint="— Admin uchun" error={errors.email}><Input type="email" value={f.email} onChange={e => set('email', e.target.value)} /></Field>
                    <Field label="Telefon" hint="— boshqa rollar uchun" error={errors.phone}><Input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="94 107 05 24" /></Field>
                    <Field label="Username" error={errors.username}><Input value={f.username} onChange={e => set('username', e.target.value)} placeholder="username" /></Field>
                    <Field label="Telegram ID" error={errors.chat_id}><Input value={f.chat_id} onChange={e => set('chat_id', e.target.value)} placeholder="123456789" /></Field>
                    <Field label="Rollar" error={errors.roles}>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(r => (
                                <label key={r.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${f.roles.includes(r.id) ? 'border-admin-primary bg-blue-50' : 'border-gray-200'}`}>
                                    <input type="checkbox" checked={f.roles.includes(r.id)} onChange={e => set('roles', e.target.checked ? [...f.roles, r.id] : f.roles.filter(x => x !== r.id))} className="h-4 w-4 rounded border-gray-300 text-admin-primary focus:ring-admin-primary" />
                                    <span className="font-medium text-gray-800">{r.title}</span>
                                </label>
                            ))}
                        </div>
                        {id && Number(id) === user.id && <p className="mt-2 text-xs text-amber-600">O‘zingizdan Admin rolini olib tashlay olmaysiz.</p>}
                    </Field>
                    <Field label="Parol" error={errors.password}><Input type="password" value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" required={!id} /></Field>
                    <Field label="Parolni tasdiqlang"><Input type="password" value={f.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} autoComplete="new-password" required={!id} /></Field>
                </div>
                <div className="mt-6 flex justify-end gap-3"><Link to="/admin/staff" className="btn-secondary">Bekor qilish</Link><SaveButton saving={saving} /></div>
            </div>
        </form>
    );
}

export function StaffShow() {
    const { id } = useParams();
    const { can } = useAuth();
    const { data: u } = useItem(`/staff/${id}`);
    if (!u) return null;

    return (
        <>
            <PageHeader title={u.name}>
                <BackLink to="/admin/staff" />
                {can('update_staff') && <Link to={`/admin/staff/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
            </PageHeader>
            <div className="card p-6 mb-6 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-4">
                    <Avatar name={u.name} size="w-16 h-16 text-2xl" />
                    <div><p className="text-lg font-semibold text-gray-900">{u.name}</p><div className="mt-1 flex flex-wrap gap-1">{u.roles.map(r => <RoleBadge key={r.id} r={r} />)}</div></div>
                </div>
                <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm lg:ml-auto">
                    {[['ID', u.id], ['Email', u.email ?? '—'], ['Telefon', u.phone_formatted ?? '—'], ['Username', u.username ?? '—'], ['Telegram ID', u.chat_id ?? '—'], ['Yaratilgan', fmtDate(u.created_at)]].map(([l, v]) => (
                        <div key={l}><dt className="text-xs text-gray-400">{l}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                </dl>
            </div>
            <RolesPermissions roles={u.roles} />
        </>
    );
}

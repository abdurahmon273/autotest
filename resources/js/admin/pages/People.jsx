import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, SquarePen } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { Actions, Avatar, BackLink, Field, Input, PageHeader, SaveButton, SearchInput, Table, Th, Td } from '../components/ui';
import { fmtDate, fmtPhone } from '../lib/utils';

export const KINDS = {
    teachers: { key: 'teacher', title: 'Ustoz', plural: 'Ustozlar' },
    students: { key: 'student', title: 'Student', plural: 'Studentlar' },
};

export function PeopleIndex({ kind }) {
    const k = KINDS[kind];
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search);
    const { data, isFetching } = useList(`/${kind}`, { search: q, page });
    const del = useDelete(`/${kind}`);

    return (
        <>
            <PageHeader title={k.plural}>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Ism, telefon, username, Telegram ID..." />
                {can(`create_${k.key}`) && <Link to={`/admin/${kind}/create`} className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={6} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th>To‘liq ism</Th><Th>Telefon</Th><Th>Username</Th><Th>Telegram ID</Th><Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                        <Td><div className="flex items-center gap-3"><Avatar name={p.name} /><span className="font-medium text-gray-900">{p.name}</span></div></Td>
                        <Td>{fmtPhone(p.phone)}</Td>
                        <Td className="text-gray-500">{p.username ?? '—'}</Td>
                        <Td className="text-gray-500">{p.chat_id ?? '—'}</Td>
                        <Td className="text-gray-500">{fmtDate(p.created_at)}</Td>
                        <Td><Actions show={can(`show_${k.key}`) && `/admin/${kind}/${p.id}`} edit={can(`update_${k.key}`) && `/admin/${kind}/${p.id}/edit`} onDelete={can(`delete_${k.key}`) && (() => del(`/${kind}/${p.id}`, `${p.name} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
        </>
    );
}

export function PersonForm({ kind }) {
    const k = KINDS[kind];
    const { id } = useParams();
    const nav = useNavigate();
    const { data } = useItem(`/${kind}/${id}`, !!id);
    const [form, setForm] = useState(null);
    const { save, saving, errors } = useSave({ onSuccess: () => nav(`/admin/${kind}`), invalidate: [`/${kind}`, `/${kind}/${id}`] });
    const f = form ?? { name: data?.name ?? '', phone: data?.phone ?? '', username: data?.username ?? '', chat_id: data?.chat_id ?? '', max_attempts: data?.max_attempts ?? 3, password: '', password_confirmation: '' };
    const set = (key, v) => setForm({ ...f, [key]: v });
    if (id && !data) return null;

    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: id ? 'put' : 'post', url: id ? `/${kind}/${id}` : `/${kind}`, data: f }); }}>
            <PageHeader title={id ? `${k.title}ni tahrirlash` : `${k.title} qo‘shish`}><BackLink to={`/admin/${kind}`} /></PageHeader>
            <div className="card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="To‘liq ism" error={errors.name}><Input value={f.name} onChange={e => set('name', e.target.value)} required /></Field>
                    <Field label="Telefon" error={errors.phone}><Input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="94 107 05 24" required /></Field>
                    <Field label="Username" error={errors.username}><Input value={f.username} onChange={e => set('username', e.target.value)} placeholder="username" /></Field>
                    <Field label="Telegram ID" error={errors.chat_id}><Input value={f.chat_id} onChange={e => set('chat_id', e.target.value)} placeholder="123456789" /></Field>
                    <Field label="Jarima imkoniyatlar soni" error={errors.max_attempts}><Input type="number" min={1} value={f.max_attempts} onChange={e => set('max_attempts', e.target.value)} /></Field>
                    <Field label="Parol" error={errors.password}><Input type="password" value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" required={!id} /></Field>
                    <Field label="Parolni tasdiqlang"><Input type="password" value={f.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} autoComplete="new-password" required={!id} /></Field>
                </div>
                <div className="mt-6 flex justify-end gap-3"><Link to={`/admin/${kind}`} className="btn-secondary">Bekor qilish</Link><SaveButton saving={saving} /></div>
            </div>
        </form>
    );
}

export function PersonShow({ kind }) {
    const k = KINDS[kind];
    const { id } = useParams();
    const { can } = useAuth();
    const { data: p } = useItem(`/${kind}/${id}`);
    if (!p) return null;

    return (
        <>
            <PageHeader title={p.name}>
                <BackLink to={`/admin/${kind}`} />
                {can(`update_${k.key}`) && <Link to={`/admin/${kind}/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
            </PageHeader>
            <div className="card p-6 max-w-lg">
                <div className="flex items-center gap-4 mb-6"><Avatar name={p.name} size="w-14 h-14 text-xl" /><div><p className="font-semibold text-gray-900">{p.name}</p><p className="text-sm text-gray-500">{k.title}</p></div></div>
                <dl className="space-y-3 text-sm">
                    {[['ID', p.id], ['Telefon', p.phone_formatted], ['Username', p.username ?? '—'], ['Telegram ID', p.chat_id ?? '—'], ["Jarima imkoniyatlar soni", p.max_attempts], ['Yaratilgan', fmtDate(p.created_at)], ['Yangilangan', fmtDate(p.updated_at)]].map(([l, v]) => (
                        <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                </dl>
            </div>
        </>
    );
}

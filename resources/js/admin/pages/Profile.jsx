import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useItem, useSave } from '../lib/hooks';
import { Avatar, Badge, Field, Input, PageHeader, SaveButton } from '../components/ui';
import { RolesPermissions } from './Staff';
import { ROLE_ADMIN, fmtDate } from '../lib/utils';

function InfoForm({ user }) {
    const [f, setF] = useState({ name: user.name, username: user.username ?? '', chat_id: user.chat_id ?? '' });
    const { save, saving, errors } = useSave({ invalidate: ['/profile', 'me'] });
    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/profile', data: f }); }} className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Shaxsiy ma’lumotlar</h3>
            <div className="space-y-4">
                <Field label="To‘liq ism" error={errors.name}><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
                <Field label="Username" error={errors.username}><Input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} placeholder="username" /></Field>
                <Field label="Telegram ID" error={errors.chat_id}><Input value={f.chat_id} onChange={e => setF({ ...f, chat_id: e.target.value })} placeholder="123456789" /></Field>
            </div>
            <div className="mt-5 flex justify-end"><SaveButton saving={saving} /></div>
        </form>
    );
}

function PasswordForm() {
    const empty = { old_password: '', password: '', password_confirmation: '' };
    const [f, setF] = useState(empty);
    const { save, saving, errors } = useSave({ onSuccess: () => setF(empty) });
    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/profile/password', data: f }); }} className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Parolni o‘zgartirish</h3>
            <div className="space-y-4">
                <Field label="Joriy parol" error={errors.old_password}><Input type="password" value={f.old_password} onChange={e => setF({ ...f, old_password: e.target.value })} autoComplete="current-password" /></Field>
                <Field label="Yangi parol" error={errors.password}><Input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
                <Field label="Yangi parolni tasdiqlang"><Input type="password" value={f.password_confirmation} onChange={e => setF({ ...f, password_confirmation: e.target.value })} autoComplete="new-password" /></Field>
            </div>
            <div className="mt-5 flex justify-end"><SaveButton saving={saving} icon={KeyRound} /></div>
        </form>
    );
}

export default function Profile() {
    const { data: u } = useItem('/profile');
    if (!u) return null;

    return (
        <>
            <PageHeader title="Profil" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="card p-6">
                    <div className="flex items-center gap-4 mb-5">
                        <Avatar name={u.name} size="w-14 h-14 text-xl" />
                        <div><p className="font-semibold text-gray-900">{u.name}</p><div className="mt-1 flex flex-wrap gap-1">{u.roles.map(r => <Badge key={r.id} color={r.id === ROLE_ADMIN ? 'blue' : 'gray'}>{r.title}</Badge>)}</div></div>
                    </div>
                    <dl className="space-y-3 text-sm">
                        {[['ID', u.id], ['Email', u.email ?? '—'], ['Telefon', u.phone_formatted ?? '—'], ['Username', u.username ?? '—'], ['Telegram ID', u.chat_id ?? '—'], ['Yaratilgan', fmtDate(u.created_at)]].map(([l, v]) => (
                            <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium">{v}</dd></div>
                        ))}
                    </dl>
                </div>
                <InfoForm key={u.updated_at} user={u} />
                <PasswordForm />
            </div>
            <RolesPermissions roles={u.roles} />
        </>
    );
}

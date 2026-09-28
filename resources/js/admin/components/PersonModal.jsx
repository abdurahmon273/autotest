import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../api';
import { useDebounce, useItem, useSave } from '../lib/hooks';
import { Field, Input, SaveButton } from '../components/ui';

function GroupSelect({ value, onChange }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const q = useDebounce(search, 250);
    const box = useRef(null);
    const input = useRef(null);
    const { data } = useQuery({ queryKey: ['groups/search', q], queryFn: () => api.get('/groups/search', { params: { search: q } }).then(r => r.data), enabled: open });

    useEffect(() => {
        const h = e => { if (!box.current?.contains(e.target)) { setOpen(false); setSearch(''); } };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const list = data ? [...(value && !data.some(g => g.id === value.id) ? [value] : []), ...data].sort((a, b) => (b.id === value?.id) - (a.id === value?.id)) : null;

    return (
        <div className="relative" ref={box}>
            <div className="form-input flex items-center justify-between cursor-text" onClick={() => { setOpen(true); input.current?.focus(); }}>
                <input ref={input} value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setOpen(true)}
                    placeholder={value ? value.name : 'Guruh qidiring...'} className={`flex-1 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none ${value && !search ? 'placeholder-gray-900' : 'placeholder-gray-400'}`} />
                {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(null); }} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
            </div>
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                    {list?.length ? list.map(g => (
                        <button key={g.id} type="button" onClick={() => { onChange(g); setSearch(''); setOpen(false); }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 ${g.id === value?.id ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}>{g.name}</button>
                    )) : <p className="px-3 py-2 text-sm text-gray-400">{list ? 'Topilmadi' : 'Yuklanmoqda...'}</p>}
                </div>
            )}
        </div>
    );
}

export default function PersonModal({ kind, title, id, onClose, onSaved }) {
    const { data } = useItem(`/${kind}/${id}`, !!id);
    const [f, setF] = useState(null);
    const { save, saving, errors } = useSave({ onSuccess: onSaved, invalidate: [`/${kind}`, `/${kind}/${id}`] });
    const isStudent = kind === 'students';

    useEffect(() => {
        if (id && !data) return;
        setF({ name: data?.name ?? '', username: data?.username ?? '', password: '', chat_id: data?.chat_id ?? '', phone: data?.phone ?? '', group: data?.group ?? null, withChat: !!data?.chat_id, withPhone: !!data?.phone });
    }, [id, data]);

    if (!f) return null;
    const set = (k, v) => setF({ ...f, [k]: v });
    const submit = e => {
        e.preventDefault();
        const payload = { name: f.name, username: f.username, password: f.password, chat_id: f.withChat ? f.chat_id : '', phone: f.withPhone ? f.phone : '' };
        if (isStudent) payload.group_id = f.group ? f.group.id : '';
        save({ method: id ? 'put' : 'post', url: id ? `/${kind}/${id}` : `/${kind}`, data: payload });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <form onSubmit={submit} className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="space-y-4">
                    <Field label="Ism" error={errors.name}><Input value={f.name} onChange={e => set('name', e.target.value)} autoFocus /></Field>
                    <Field label="Username" error={errors.username}><Input value={f.username} onChange={e => set('username', e.target.value)} /></Field>
                    <Field label={id ? 'Parol (o‘zgartirmasangiz bo‘sh qoldiring)' : 'Parol'} error={errors.password}><Input type="password" value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" /></Field>

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={f.withChat} onChange={e => set('withChat', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-admin-primary" /> Telegram ID qo‘shish</label>
                    {f.withChat && <Field error={errors.chat_id}><Input value={f.chat_id} onChange={e => set('chat_id', e.target.value)} placeholder="123456789" /></Field>}

                    {isStudent && <Field label="Guruh (ixtiyoriy)" error={errors.group_id}><GroupSelect value={f.group} onChange={g => set('group', g)} /></Field>}

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={f.withPhone} onChange={e => set('withPhone', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-admin-primary" /> Telefon raqam qo‘shish</label>
                    {f.withPhone && <Field error={errors.phone}><Input value={f.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="941070524" inputMode="numeric" /></Field>}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" className="btn-secondary" onClick={onClose}>Bekor qilish</button>
                    <SaveButton saving={saving}>{id ? 'Saqlash' : 'Qo‘shish'}</SaveButton>
                </div>
            </form>
        </div>
    );
}

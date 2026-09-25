import { useState } from 'react';
import { Eye, EyeOff, FileQuestion, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useDelete, useItem, useSave } from '../lib/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { messageOf } from '../api';
import { useToast } from '../lib/toast';
import { Badge, Empty, Field, Input, PageHeader, SaveButton, Th, Td } from '../components/ui';

export function TelegramSettings() {
    const { data } = useItem('/settings/telegram');
    const [token, setToken] = useState(null);
    const { save, saving, errors } = useSave({ invalidate: ['/settings/telegram'] });
    if (!data) return null;
    const t = token ?? data.token;

    return (
        <>
            <PageHeader title="Telegram sozlamalari" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/settings/telegram', data: { token: t } }); }} className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Telegram bot sozlash</h3>
                    <Field label="Bot token" error={errors.token}><Input value={t} onChange={e => setToken(e.target.value)} className="font-mono" placeholder="123456789:AAH..." /></Field>
                    <div className="mt-5 flex justify-end"><SaveButton saving={saving} /></div>
                </form>
            </div>
        </>
    );
}

export function Tests() {
    return (
        <>
            <PageHeader title="Testlar" />
            <div className="card p-12 text-center text-sm text-gray-400"><FileQuestion className="w-8 h-8 mx-auto mb-2 text-gray-300" />Hozircha bo‘sh</div>
        </>
    );
}

function LanguageModal({ item, onClose, onSaved }) {
    const [f, setF] = useState({ title: item?.title ?? '', code: item?.code ?? '' });
    const { save, saving, errors } = useSave({ onSuccess: onSaved, invalidate: ['/settings/general'] });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <form onSubmit={e => { e.preventDefault(); save({ method: item ? 'put' : 'post', url: item ? `/settings/languages/${item.id}` : '/settings/languages', data: f }); }} className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900 mb-4">{item ? 'Tilni tahrirlash' : 'Til qo‘shish'}</h3>
                <div className="space-y-4">
                    <Field label="Nomi" error={errors.title}><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} autoFocus /></Field>
                    <Field label="Kodi" error={errors.code}><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="uz-latn" className="font-mono" /></Field>
                </div>
                <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={onClose}>Bekor qilish</button><SaveButton saving={saving} /></div>
            </form>
        </div>
    );
}

export function GeneralSettings() {
    const { data } = useItem('/settings/general');
    const [form, setForm] = useState(null);
    const [modal, setModal] = useState(null);
    const { save, saving, errors } = useSave({ invalidate: ['/settings/general', '/questions/languages', '/themes/languages'] });
    const del = useDelete('/settings/general');
    const qc = useQueryClient();
    const toast = useToast();
    const toggle = useMutation({ mutationFn: id => api.patch(`/settings/languages/${id}/toggle`).then(r => r.data), onSuccess: d => { toast(d.message); qc.invalidateQueries({ queryKey: ['/settings/general'] }); }, onError: e => toast(messageOf(e), 'error') });
    if (!data) return null;
    const f = form ?? { default_language_id: data.default_language_id ?? '', max_attempts_count: data.max_attempts_count };
    const set = (k, v) => setForm({ ...f, [k]: v });

    return (
        <>
            <PageHeader title="Umumiy sozlamalar" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/settings/general', data: { default_language_id: f.default_language_id, max_attempts_count: data.max_attempts_count } }); }} className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Birlamchi til</h3>
                    <Field error={errors.default_language_id}>
                        <select value={f.default_language_id} onChange={e => set('default_language_id', e.target.value)} className="form-input">
                            <option value="">Tanlanmagan</option>
                            {data.languages.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                        </select>
                    </Field>
                    <div className="mt-5 flex justify-end"><SaveButton saving={saving} /></div>
                </form>

                <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/settings/general', data: { default_language_id: data.default_language_id, max_attempts_count: f.max_attempts_count } }); }} className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Jarima imkoniyatlar soni</h3>
                    <Field error={errors.max_attempts_count}><Input type="number" min={1} value={f.max_attempts_count} onChange={e => set('max_attempts_count', e.target.value)} /></Field>
                    <div className="mt-5 flex justify-end"><SaveButton saving={saving} /></div>
                </form>

                <div className="card">
                    <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Tillar</h3>
                        <button type="button" className="btn-primary py-1.5" onClick={() => setModal({})}><Plus className="w-4 h-4" /> Qo‘shish</button>
                    </div>
                    <table className="min-w-full">
                        <thead className="border-b border-gray-200"><tr><Th className="w-12">#</Th><Th>Nomi</Th><Th>Kodi</Th><Th>Holati</Th><Th className="text-right">Amallar</Th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.languages.length ? data.languages.map(l => (
                                <tr key={l.id} className="hover:bg-gray-50">
                                    <Td className="text-gray-400">{l.id}</Td>
                                    <Td className="font-medium text-gray-900">{l.title}{l.id === data.default_language_id && <Badge className="ml-2">birlamchi</Badge>}</Td>
                                    <Td className="font-mono text-xs">{l.code}</Td>
                                    <Td>
                                        <button type="button" onClick={() => toggle.mutate(l.id)} title={l.status ? 'Ko‘rinadi' : 'Ko‘rinmaydi'} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${l.status ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${l.status ? 'translate-x-5' : 'translate-x-0.5'}`}>{l.status ? <Eye className="w-3 h-3 text-green-600" /> : <EyeOff className="w-3 h-3 text-gray-400" />}</span>
                                        </button>
                                    </Td>
                                    <Td><div className="flex items-center justify-end gap-1">
                                        <button type="button" onClick={() => setModal(l)} className="icon-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50"><SquarePen className="w-4 h-4" /></button>
                                        <button type="button" onClick={() => del(`/settings/languages/${l.id}`, `${l.title} o‘chirilsinmi?`)} className="icon-btn text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                                    </div></Td>
                                </tr>
                            )) : <Empty colSpan={5} />}
                        </tbody>
                    </table>
                </div>
            </div>
            {modal && <LanguageModal item={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
        </>
    );
}

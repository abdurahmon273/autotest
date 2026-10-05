import { useRef, useState } from 'react';
import { Eye, EyeOff, FileQuestion, Image as ImageIcon, LoaderCircle, Plus, Send, SquarePen, Trash2, Upload } from 'lucide-react';
import { useDelete, useItem, useSave } from '../lib/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { messageOf } from '../api';
import { useToast } from '../lib/toast';
import { Badge, Empty, Field, Input, PageHeader, SaveButton, Td, Th, THead } from '../components/ui';

/** Rasmsiz savollar uchun standart rasm — alohida karta, alohida API. */
function QuizImageCard({ url }) {
    const qc = useQueryClient();
    const toast = useToast();
    const file = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const refresh = () => qc.invalidateQueries({ queryKey: ['/settings/general'] });

    const upload = async e => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'].includes(f.type)) return setError('Rasm formati qo‘llab-quvvatlanmaydi (jpg, png, gif, webp, bmp).');
        setError(null); setBusy(true);
        const fd = new FormData(); fd.append('image', f);
        try { const { data } = await api.post('/settings/quiz-image', fd); toast(data.message); refresh(); }
        catch (err) { setError(err.response?.data?.errors?.image?.[0] ?? messageOf(err)); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        setBusy(true);
        try { const { data } = await api.delete('/settings/quiz-image'); toast(data.message); refresh(); }
        catch (err) { toast(messageOf(err), 'error'); }
        finally { setBusy(false); }
    };

    return (
        <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Test uchun standart rasm</h3>
                    <p className="mt-1 text-xs text-gray-500">Rasmi bo‘lmagan savollarda test yechish paytida shu rasm ko‘rsatiladi.</p>
                </div>
                <ImageIcon className="w-5 h-5 text-gray-300 shrink-0" />
            </div>
            <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden aspect-[16/7] flex items-center justify-center">
                {url ? <img src={url} alt="" className="w-full h-full object-contain" /> : <span className="text-sm text-gray-400 flex flex-col items-center gap-2"><ImageIcon className="w-8 h-8 text-gray-300" />Rasm yuklanmagan</span>}
                {busy && <span className="absolute inset-0 bg-white/70 flex items-center justify-center"><LoaderCircle className="w-6 h-6 animate-spin text-admin-primary" /></span>}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <input ref={file} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.bmp" className="hidden" onChange={upload} />
            <div className="mt-4 flex items-center justify-end gap-2">
                {url && <button type="button" onClick={remove} disabled={busy} className="btn-secondary text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> O‘chirish</button>}
                <button type="button" onClick={() => file.current.click()} disabled={busy} className="btn-primary"><Upload className="w-4 h-4" /> {url ? 'Almashtirish' : 'Yuklash'}</button>
            </div>
        </div>
    );
}

export function TelegramSettings() {
    const { data } = useItem('/settings/telegram');
    const [token, setToken] = useState(null);
    const [hours, setHours] = useState(null);
    const { save, saving, errors } = useSave({ invalidate: ['/settings/telegram'] });
    const notif = useSave({ invalidate: ['/settings/telegram'] });
    const [text, setText] = useState('');
    const toast = useToast();
    const broadcast = useMutation({
        mutationFn: () => api.post('/settings/telegram/broadcast', { text }).then(r => r.data),
        onSuccess: d => { toast(d.message); setText(''); },
        onError: e => toast(messageOf(e), 'error'),
    });
    if (!data) return null;
    const t = token ?? data.token;
    const h = hours ?? data.task_notification_time;

    return (
        <>
            <PageHeader title="Telegram sozlamalari" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/settings/telegram', data: { token: t } }); }} className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Telegram bot sozlash</h3>
                    <Field label="Bot token" error={errors.token}><Input value={t} onChange={e => setToken(e.target.value)} className="font-mono" placeholder="123456789:AAH..." /></Field>
                    <div className="mt-5 flex justify-end"><SaveButton saving={saving} /></div>
                </form>

                <form onSubmit={e => { e.preventDefault(); notif.save({ method: 'put', url: '/settings/telegram/notification', data: { task_notification_time: h } }); }} className="card p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Vazifa eslatmasi</h3>
                    <Field label="Tugashidan necha soat oldin" error={notif.errors.task_notification_time}><Input type="number" min={1} max={168} value={h} onChange={e => setHours(e.target.value)} /></Field>
                    <p className="mt-2 text-xs text-gray-400">Shu vaqt qolganda studentlarga botdan eslatma yuboriladi.</p>
                    <div className="mt-5 flex justify-end"><SaveButton saving={notif.saving} /></div>
                </form>

                <form onSubmit={e => { e.preventDefault(); if (text.trim()) broadcast.mutate(); }} className="card p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Barcha studentlarga xabar</h3>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={4000} placeholder="Xabar matni..." className="form-input resize-none" disabled={broadcast.isPending} />
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Faqat chat ID si bor studentlarga botdan yuboriladi.</p>
                        <SaveButton saving={broadcast.isPending} icon={Send} disabled={!text.trim() || broadcast.isPending}>Yuborish</SaveButton>
                    </div>
                </form>
            </div>
        </>
    );
}

export const Placeholder = ({ title }) => (
    <>
        <PageHeader title={title} />
        <div className="card p-12 text-center text-sm text-gray-400"><FileQuestion className="w-8 h-8 mx-auto mb-2 text-gray-300" />Hozircha bo‘sh</div>
    </>
);

export const Tests = () => <Placeholder title="Testlar" />;

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
    const f = form ?? { default_language_id: data.default_language_id ?? '', max_attempts_count: data.max_attempts_count, twenty_quiz_time: data.twenty_quiz_time, fifty_quiz_time: data.fifty_quiz_time, quiz_wait_time: data.quiz_wait_time };
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

                <QuizImageCard url={data.default_quiz_image_url} />

                <div className="card">
                    <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Tillar</h3>
                        <button type="button" className="btn-primary py-1.5" onClick={() => setModal({})}><Plus className="w-4 h-4" /> Qo‘shish</button>
                    </div>
                    <table className="min-w-full">
                        <THead><Th className="w-12">#</Th><Th>Nomi</Th><Th>Kodi</Th><Th>Holati</Th><Th className="text-right">Amallar</Th></THead>
                        <tbody className="table-body">
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
                <form onSubmit={e => { e.preventDefault(); save({ method: 'put', url: '/settings/general', data: { default_language_id: data.default_language_id, max_attempts_count: data.max_attempts_count, twenty_quiz_time: f.twenty_quiz_time, fifty_quiz_time: f.fifty_quiz_time, quiz_wait_time: f.quiz_wait_time } }); }} className="card p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Imtihon vaqtlari</h3>
                    <div className="flex flex-wrap items-end gap-4">
                        <Field label="20 talik" hint="(daqiqa)" error={errors.twenty_quiz_time} className="w-40"><Input type="number" min={1} value={f.twenty_quiz_time} onChange={e => set('twenty_quiz_time', e.target.value)} /></Field>
                        <Field label="50 talik" hint="(daqiqa)" error={errors.fifty_quiz_time} className="w-40"><Input type="number" min={1} value={f.fifty_quiz_time} onChange={e => set('fifty_quiz_time', e.target.value)} /></Field>
                        <Field label="Kutish" hint="(soniya)" error={errors.quiz_wait_time} className="w-40"><Input type="number" min={0} value={f.quiz_wait_time} onChange={e => set('quiz_wait_time', e.target.value)} /></Field>
                        <p className="text-xs text-gray-400 pb-2.5">Kutish — javob tasdiqlangandan keyin keyingi savolga o‘tish vaqti.</p>
                        <div className="ml-auto"><SaveButton saving={saving} /></div>
                    </div>
                </form>
            </div>
            {modal && <LanguageModal item={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
        </>
    );
}

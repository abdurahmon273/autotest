import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Image, Plus, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { Actions, Field, Input, PageHeader, SaveButton, SearchInput, Table, Th, Td } from '../components/ui';
import ThemeLabel from '../components/ThemeLabel';
import { fmtDate } from '../lib/utils';

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg';
const MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
export const checkImage = f => (f && !MIMES.includes(f.type) ? 'Rasm formati qo‘llab-quvvatlanmaydi (jpg, png, gif, webp, bmp, svg).' : null);

export function ThemesIndex() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search);
    const { data, isFetching } = useList('/themes', { search: q, page });
    const del = useDelete('/themes');

    return (
        <>
            <PageHeader title="Mavzular">
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Mavzu qidirish..." />
                {can('create_theme') && <Link to="/admin/themes/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={6} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th className="w-12">#</Th><Th>Mavzu (lotin)</Th><Th>Mavzu (krill)</Th><Th>Savollar</Th><Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                        <Td className="text-gray-400">{t.id}</Td><Td className="font-medium text-gray-900"><ThemeLabel theme={t} /></Td><Td className="text-gray-700">{t.title_krill ?? '—'}</Td><Td>{t.questions_count}</Td><Td className="text-gray-500">{fmtDate(t.created_at)}</Td>
                        <Td><Actions edit={can('update_theme') && `/admin/themes/${t.id}/edit`} onDelete={can('delete_theme') && (() => del(`/themes/${t.id}`, `${t.title ?? t.title_krill} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
        </>
    );
}

export function ThemeForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const { data } = useItem(`/themes/${id}`, !!id);
    const { data: langs } = useItem('/themes/languages');
    const [form, setForm] = useState(null);
    const [icon, setIcon] = useState(null);
    const [removeIcon, setRemoveIcon] = useState(false);
    const [iconError, setIconError] = useState(null);
    const file = useRef(null);
    const { save, saving, errors } = useSave({ onSuccess: () => nav('/admin/themes'), invalidate: ['/themes', `/themes/${id}`, 'themes/search', '/questions/themes'] });
    if ((id && !data) || !langs) return null;

    const f = form ?? { title: data?.title ?? '', title_krill: data?.title_krill ?? '', icon_type: data?.icon_type ?? 0, icon_text: data?.icon_type === 0 ? data?.icon ?? '' : '' };
    const set = (k, v) => setForm({ ...f, [k]: v });
    const preview = icon ? URL.createObjectURL(icon) : removeIcon ? null : data?.icon_url;

    const pick = e => {
        const fl = e.target.files[0];
        e.target.value = '';
        const err = checkImage(fl);
        setIconError(err);
        if (!err) { setIcon(fl); setRemoveIcon(false); }
    };

    return (
        <form onSubmit={e => { e.preventDefault(); save({ method: id ? 'put' : 'post', url: id ? `/themes/${id}` : '/themes', data: { ...f, icon, remove_icon: removeIcon }, multipart: true }); }}>
            <PageHeader title={id ? 'Mavzuni tahrirlash' : 'Mavzu qo‘shish'}>
                <Link to="/admin/themes" className="btn-secondary">Bekor qilish</Link>
                <SaveButton saving={saving} />
            </PageHeader>
            <div className="card p-6">
                <div className="flex items-start gap-6">
                    <div className="shrink-0 w-40">
                        <label className="form-label">Icon turi</label>
                        <div className="flex gap-2 mb-3">
                            {[[0, 'Emoji'], [1, 'Rasm']].map(([k, v]) => (
                                <label key={k} className={`flex-1 flex items-center justify-center rounded-lg border px-3 py-2 text-sm cursor-pointer ${f.icon_type === k ? 'border-admin-primary bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" className="hidden" checked={f.icon_type === k} onChange={() => set('icon_type', k)} />{v}
                                </label>
                            ))}
                        </div>
                        {f.icon_type === 0 ? (
                            <Field error={errors.icon_text}><Input value={f.icon_text} onChange={e => set('icon_text', e.target.value)} placeholder="🚦" className="text-center text-2xl" maxLength={16} /></Field>
                        ) : (
                            <>
                                <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
                                    {preview ? <>
                                        <img src={preview} className="w-full h-full object-cover" alt="" />
                                        <button type="button" onClick={() => { setIcon(null); setRemoveIcon(true); }} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/90 text-red-600 shadow flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                                    </> : <span className="absolute inset-0 flex items-center justify-center text-gray-400"><Image className="w-6 h-6" /></span>}
                                </div>
                                <input ref={file} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={pick} />
                                <button type="button" onClick={() => file.current.click()} className="mt-2 w-24 btn-secondary justify-center py-1.5 text-xs">Tanlash</button>
                                {(iconError || errors.icon) && <span className="text-red-600 text-xs block">{iconError ?? errors.icon[0]}</span>}
                            </>
                        )}
                    </div>
                    <div className="flex-1 max-w-xl space-y-4">
                        {langs.map(l => {
                            const k = l.key === 'krill' ? 'title_krill' : 'title';
                            return <Field key={k} label={<>Nomi ({l.title}) {l.default && <span className="text-red-500">*</span>}</>} error={errors[k]}><Input value={f[k]} onChange={e => set(k, e.target.value)} required={l.default} /></Field>;
                        })}
                    </div>
                </div>
            </div>
        </form>
    );
}

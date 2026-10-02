import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, GripVertical, Image, LoaderCircle, Plus, X } from 'lucide-react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { messageOf } from '../api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useSave } from '../lib/hooks';
import { Actions, Badge, Empty, Field, Input, PageHeader, SaveButton, SearchInput, SkeletonRows, Th, THead, Td } from '../components/ui';
import ThemeLabel from '../components/ThemeLabel';
import { cx } from '../lib/utils';

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg';
const MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
export const checkImage = f => (f && !MIMES.includes(f.type) ? 'Rasm formati qo‘llab-quvvatlanmaydi (jpg, png, gif, webp, bmp, svg).' : null);

export function ThemesIndex() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const q = useDebounce(search);
    const del = useDelete('/themes');
    const qc = useQueryClient();
    const toast = useToast();
    const sentinel = useRef(null);
    const [drag, setDrag] = useState(null); // sudralayotgan id
    const [over, setOver] = useState(null); // ustida turgan id
    const [local, setLocal] = useState(null); // optimistik tartib

    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['/themes', { search: q, status }],
        queryFn: ({ pageParam = 1 }) => api.get('/themes', { params: { search: q, status, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
    });
    const rows = local ?? data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;
    useEffect(() => { setLocal(null); }, [data]);
    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    const toggle = useMutation({ mutationFn: id => api.patch(`/themes/${id}/toggle`).then(r => r.data), onSuccess: d => { toast(d.message); qc.invalidateQueries({ queryKey: ['/themes'] }); }, onError: e => toast(messageOf(e), 'error') });
    const reorder = useMutation({
        mutationFn: ids => api.put('/themes/reorder', { ids }).then(r => r.data),
        onSuccess: d => { toast(d.message); qc.invalidateQueries({ queryKey: ['/themes'] }); qc.invalidateQueries({ queryKey: ['/questions/themes'] }); },
        onError: e => { toast(messageOf(e), 'error'); setLocal(null); },
    });
    const canDrag = can('update_theme') && !q && status === '';

    const onDrop = targetId => {
        if (drag === null || drag === targetId) { setDrag(null); setOver(null); return; }
        const list = [...rows];
        const from = list.findIndex(t => t.id === drag), to = list.findIndex(t => t.id === targetId);
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
        setLocal(list); setDrag(null); setOver(null);
        reorder.mutate(list.map(t => t.id));
    };

    return (
        <>
            <PageHeader title="Mavzular">
                <SearchInput value={search} onChange={setSearch} placeholder="Mavzu qidirish..." />
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-input !w-40 shrink-0"><option value="">Barchasi</option><option value="1">Faol</option><option value="0">Yashirin</option></select>
                {can('create_theme') && <Link to="/admin/themes/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            {canDrag && <p className="mb-3 text-sm text-gray-500 flex items-center gap-1.5"><GripVertical className="w-4 h-4" /> Qatorlarni sudrab tartibni o‘zgartiring. Bu tartib menyuda va barcha ro‘yxatlarda ishlatiladi.</p>}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead>{canDrag && <Th className="w-10" />}<Th className="w-12">#</Th><Th>Mavzu (lotin)</Th><Th>Mavzu (krill)</Th><Th>Savollar</Th><Th>Holat</Th><Th className="text-right">Amallar</Th></THead>
                    <tbody className="table-body">
                        {isLoading ? <SkeletonRows cols={canDrag ? 7 : 6} /> : rows.length ? rows.map((t, i) => (
                            <tr key={t.id} draggable={canDrag} onDragStart={() => setDrag(t.id)} onDragOver={e => { if (canDrag) { e.preventDefault(); setOver(t.id); } }} onDragLeave={() => setOver(null)} onDrop={() => onDrop(t.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                                className={cx(drag === t.id && 'opacity-40', over === t.id && drag !== t.id && 'bg-blue-50 border-t-2 border-admin-primary', canDrag && 'cursor-grab active:cursor-grabbing')}>
                                {canDrag && <Td className="text-gray-300"><GripVertical className="w-4 h-4" /></Td>}
                                <Td className="text-gray-400">{i + 1}</Td>
                                <Td className="font-medium text-gray-900"><ThemeLabel theme={t} /></Td>
                                <Td className="text-gray-700">{t.title_krill ?? '—'}</Td>
                                <Td>{t.questions_count}</Td>
                                <Td>{t.status ? <Badge color="green">Faol</Badge> : <Badge color="gray">Yashirin</Badge>}</Td>
                                <Td><Actions edit={can('update_theme') && `/admin/themes/${t.id}/edit`}
                                    extra={can('update_theme') && <button type="button" onClick={() => toggle.mutate(t.id)} disabled={toggle.isPending} title={t.status ? 'Yashirish' : 'Faollashtirish'} className={t.status ? 'icon-btn text-green-600 hover:bg-green-50' : 'icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100'}>{t.status ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>}
                                    onDelete={can('delete_theme') && (() => del(`/themes/${t.id}`, `${t.title ?? t.title_krill} o‘chirilsinmi?`))} /></Td>
                            </tr>
                        )) : <Empty colSpan={7} />}
                    </tbody>
                </table></div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">{isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : rows.length ? `${rows.length} / ${total}` : ''}</div>
            </div>
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

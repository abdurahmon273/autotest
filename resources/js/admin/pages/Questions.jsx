import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, Eye, Image, ImagePlus, Lightbulb, Plus, SquarePen, Text, Trash2, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList, useSave } from '../lib/hooks';
import { useLightbox } from '../lib/lightbox';
import { Actions, BackLink, Badge, Field, PageHeader, SaveButton, SearchInput, Table, Th, Td } from '../components/ui';
import ThemeLabel from '../components/ThemeLabel';
import ThemeSelect from '../components/ThemeSelect';
import { IMAGE_ACCEPT, checkImage } from './Themes';
import { QUESTION_TYPES, cx } from '../lib/utils';

/** Ro'yxatdagi kichik rasm; sichqoncha ustida bo'lganda shu rasmning o'zi kursor yonida kattaroq ko'rsatiladi (qo'shimcha so'rov yo'q). */
function HoverImage({ src }) {
    const [pos, setPos] = useState(null);
    const move = e => {
        const W = 420, H = 300, pad = 16;
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + W > window.innerWidth) x = e.clientX - W - pad;
        if (y + H > window.innerHeight) y = Math.max(8, window.innerHeight - H - 8);
        setPos({ x, y });
    };
    return (
        <>
            <img src={src} alt="" className="w-12 h-9 rounded object-cover shrink-0 cursor-zoom-in" onMouseEnter={move} onMouseMove={move} onMouseLeave={() => setPos(null)} />
            {pos && (
                <div className="fixed z-[70] pointer-events-none rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl animate-pop" style={{ left: pos.x, top: pos.y }}>
                    <img src={src} alt="" className="block max-w-[420px] max-h-[300px] w-auto h-auto rounded-lg object-contain" />
                </div>
            )}
        </>
    );
}

export function QuestionsIndex() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [theme, setTheme] = useState('');
    const [archived, setArchived] = useState('');
    const [type, setType] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search, 150);
    const effective = q.trim().length >= 2 ? q.trim() : '';
    const { data, isFetching } = useList('/questions', { search: effective, theme, archived_theme: archived, type, page });
    const searching = search.trim().length >= 2 && (search.trim() !== effective || isFetching);
    const { data: themes } = useItem('/questions/themes');
    const { data: archivedThemes } = useItem('/questions/themes/archived');
    const del = useDelete('/questions');

    return (
        <>
            <PageHeader title="Savollar">
                <select value={archived ? `a:${archived}` : theme} onChange={e => { const v = e.target.value; if (v.startsWith('a:')) { setArchived(v.slice(2)); setTheme(''); } else { setArchived(''); setTheme(v); } setPage(1); }} className="form-input w-56">
                    <option value="">Barcha mavzular</option>
                    {archivedThemes?.length > 0 && (
                        <optgroup label="Arxiv mavzular">
                            {archivedThemes.map(t => <option key={`a${t.id}`} value={`a:${t.id}`}>{t.title ?? t.title_krill}</option>)}
                        </optgroup>
                    )}
                    <option value="active">Arxiv mavzularsiz</option>
                    <optgroup label="Mavzular">
                        {themes?.map(t => <option key={t.id} value={t.id}>{t.title ?? t.title_krill}</option>)}
                    </optgroup>
                </select>
                <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="form-input w-32"><option value="">Barcha turlar</option>{Object.entries(QUESTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Savol qidirish..." loading={searching} />
                {can('create_question') && <Link to="/admin/questions/create" className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</Link>}
            </PageHeader>
            <Table cols={6} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th className="w-12">#</Th><Th>Savol</Th><Th>Turi</Th><Th>Mavzular</Th><Th>Javoblar</Th><Th className="text-right">Amallar</Th></>}
                render={qn => (
                    <tr key={qn.id} className="hover:bg-gray-50">
                        <Td className="text-gray-400">{qn.id}</Td>
                        <Td><div className="flex items-center gap-3">{qn.image_url && <HoverImage src={qn.image_url} />}<span className="font-medium text-gray-900 line-clamp-2 max-w-md">{qn.question_latin ?? qn.question_krill}</span></div></Td>
                        <Td><Badge color={qn.type ? 'purple' : 'gray'}>{QUESTION_TYPES[qn.type]}</Badge></Td>
                        <Td><div className="flex flex-wrap gap-1">{qn.themes.map(t => <Badge key={t.id} color={t.status === 0 ? 'gray' : 'blue'}><ThemeLabel theme={t} /></Badge>)}</div></Td>
                        <Td>{qn.answers_count}</Td>
                        <Td><Actions show={can('show_question') && `/admin/questions/${qn.id}`} edit={can('update_question') && `/admin/questions/${qn.id}/edit`} onDelete={can('delete_question') && (() => del(`/questions/${qn.id}`, 'Savol o‘chirilsinmi?'))} /></Td>
                    </tr>
                )} />
        </>
    );
}

const blank = () => ({ type: 0, question_krill: '', question_latin: '', instruction_krill: '', instruction_latin: '', themes: [], answers: [{ text_krill: '', text_latin: '', is_correct: true }, { text_krill: '', text_latin: '', is_correct: false }] });

export function QuestionForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const lightbox = useLightbox();
    const { data } = useItem(`/questions/${id}/edit`, !!id);
    const { data: langs } = useItem('/questions/languages');
    const [form, setForm] = useState(null);
    const [lang, setLang] = useState(null);
    const [image, setImage] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [imageError, setImageError] = useState(null);
    const [tips, setTips] = useState(null);
    const file = useRef(null);
    const { save, saving, errors } = useSave({ onSuccess: () => nav('/admin/questions'), invalidate: ['/questions', `/questions/${id}`, `/questions/${id}/edit`] });
    if ((id && !data) || !langs) return null;

    const L = lang ?? (langs.find(l => l.default) ?? langs[0]).key;
    const f = form ?? (data ? { type: data.type, question_krill: data.question_krill ?? '', question_latin: data.question_latin ?? '', instruction_krill: data.instruction_krill ?? '', instruction_latin: data.instruction_latin ?? '', themes: data.themes, answers: data.answers.map(a => ({ text_krill: a.text_krill ?? '', text_latin: a.text_latin ?? '', is_correct: !!a.is_correct })) } : blank());
    const set = (k, v) => setForm({ ...f, [k]: v });
    const setAnswer = (i, patch) => set('answers', f.answers.map((a, j) => (j === i ? { ...a, ...patch } : a)));
    const showTips = tips ?? !!(f.instruction_krill || f.instruction_latin);
    const preview = image ? URL.createObjectURL(image) : removeImage ? null : data?.image_url;

    const pick = e => {
        const fl = e.target.files[0];
        e.target.value = '';
        const err = checkImage(fl);
        setImageError(err);
        if (!err) { setImage(fl); setRemoveImage(false); }
    };

    const submit = e => {
        e.preventDefault();
        save({ method: id ? 'put' : 'post', url: id ? `/questions/${id}` : '/questions', multipart: true,
            data: { type: f.type, question_krill: f.question_krill, question_latin: f.question_latin, instruction_krill: f.instruction_krill, instruction_latin: f.instruction_latin, themes: f.themes.map(t => t.id), answers: f.answers, image, remove_image: removeImage } });
    };

    return (
        <form onSubmit={submit}>
            <PageHeader title={id ? 'Savolni tahrirlash' : 'Savol qo‘shish'}>
                <Link to="/admin/questions" className="btn-secondary">Bekor qilish</Link>
                <SaveButton saving={saving} />
            </PageHeader>
            <div className="mb-5 inline-flex rounded-lg border border-gray-200 bg-white p-1">
                {langs.map(l => {
                    const bad = errors[`question_${l.key}`] || f.answers.some((_, i) => errors[`answers.${i}.text_${l.key}`]);
                    return (
                        <button key={l.key} type="button" onClick={() => setLang(l.key)} className={cx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', L === l.key ? 'bg-admin-primary text-white' : 'text-gray-700 hover:bg-gray-100', bad && L !== l.key && 'text-red-600')}>
                            {l.title}{l.default && <span className="ml-1 text-xs opacity-70">•</span>}
                        </button>
                    );
                })}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="card p-6">
                        <Field label="Savol" error={errors[`question_${L}`]}><textarea value={f[`question_${L}`]} onChange={e => set(`question_${L}`, e.target.value)} rows={3} className="form-input" /></Field>
                        <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => setTips(!showTips)} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100">
                                <Lightbulb className="w-4 h-4" /> Qo‘llanma <ChevronDown className={cx('w-4 h-4 transition-transform', showTips && 'rotate-180')} />
                            </button>
                        </div>
                        {showTips && <Field error={errors[`instruction_${L}`]}><textarea value={f[`instruction_${L}`]} onChange={e => set(`instruction_${L}`, e.target.value)} rows={4} className="form-input mt-3" placeholder="Qo‘llanma matni..." /></Field>}
                    </div>

                    <div className="card">
                        <div className="px-5 py-4 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-900">Javoblar <span className="text-gray-400 font-normal">({f.answers.length})</span></h3></div>
                        <div className="divide-y divide-gray-100">
                            {f.answers.map((a, i) => (
                                <div key={i}>
                                    <div className="flex items-center gap-3 px-5 py-3">
                                        <span className="w-6 text-sm text-gray-400 text-center">{i + 1}</span>
                                        <input type="radio" name="correct" checked={a.is_correct} onChange={() => set('answers', f.answers.map((x, j) => ({ ...x, is_correct: j === i })))} className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500" title="To‘g‘ri javob" />
                                        <input value={a[`text_${L}`]} onChange={e => setAnswer(i, { [`text_${L}`]: e.target.value })} className={cx('form-input flex-1', a.is_correct && 'border-green-400 bg-green-50')} placeholder="Javob matni" />
                                        <button type="button" disabled={f.answers.length <= 2} onClick={() => set('answers', f.answers.filter((_, j) => j !== i))} className="icon-btn text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"><X className="w-4 h-4" /></button>
                                    </div>
                                    {errors[`answers.${i}.text_${L}`] && <p className="px-5 pb-2 -mt-1 text-red-600 text-xs">{errors[`answers.${i}.text_${L}`][0]}</p>}
                                </div>
                            ))}
                        </div>
                        {errors.answers && <p className="px-5 py-3 border-t border-gray-100 text-red-600 text-xs">{errors.answers[0]}</p>}
                        {f.answers.length < 10 && (
                            <button type="button" onClick={() => set('answers', [...f.answers, { text_krill: '', text_latin: '', is_correct: false }])} className="w-full flex items-center justify-center gap-2 border-t border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-b-xl"><Plus className="w-4 h-4" /> Javob qo‘shish</button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="card p-6">
                        <Field label="Mavzular" error={errors.themes}><ThemeSelect value={f.themes} onChange={v => set('themes', v)} /></Field>
                    </div>
                    <div className="card p-6">
                        <label className="form-label">Turi</label>
                        <div className="flex gap-2">
                            {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                                <label key={k} className={cx('flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer', f.type === Number(k) ? 'border-admin-primary bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50')}>
                                    <input type="radio" className="hidden" checked={f.type === Number(k)} onChange={() => set('type', Number(k))} />
                                    {Number(k) ? <Image className="w-4 h-4" /> : <Text className="w-4 h-4" />} {v}
                                </label>
                            ))}
                        </div>
                        {f.type === 1 && (
                            <div className="mt-4">
                                <label className="form-label">Rasm</label>
                                <input ref={file} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={pick} />
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => file.current.click()} className="btn-secondary flex-1 justify-center"><ImagePlus className="w-4 h-4" /> {preview ? 'Rasmni almashtirish' : 'Rasm tanlash'}</button>
                                    {preview && <button type="button" onClick={() => { setImage(null); setRemoveImage(true); }} className="icon-btn border border-gray-200 text-red-600 hover:bg-red-50" title="O‘chirish"><Trash2 className="w-4 h-4" /></button>}
                                </div>
                                {preview && (
                                    <div className="relative mt-3 group cursor-zoom-in" onClick={() => lightbox(preview)}>
                                        <img src={preview} alt="" className="w-full rounded-lg border border-gray-200 object-contain bg-gray-50" />
                                        <span className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white/90 text-gray-700 shadow flex items-center justify-center group-hover:bg-white"><Eye className="w-5 h-5" /></span>
                                    </div>
                                )}
                                {(imageError || errors.image) && <span className="text-red-600 text-xs">{imageError ?? errors.image[0]}</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}

export function QuestionShow() {
    const { id } = useParams();
    const { can } = useAuth();
    const { data: q } = useItem(`/questions/${id}`);
    if (!q) return null;

    return (
        <>
            <PageHeader title="Savol">
                <BackLink to="/admin/questions" />
                {can('update_question') && <Link to={`/admin/questions/${id}/edit`} className="btn-primary"><SquarePen className="w-4 h-4" /> Tahrirlash</Link>}
            </PageHeader>
            <div className="card p-6 max-w-3xl">
                <div className="flex flex-wrap gap-1 mb-4">{q.themes.map(t => <Badge key={t.id}><ThemeLabel theme={t} /></Badge>)}</div>
                <h2 className="text-lg font-semibold text-gray-900">{q.question_latin ?? q.question_krill}</h2>
                {q.question_latin && q.question_krill && <p className="mt-1 text-gray-500">{q.question_krill}</p>}
                {q.image_url && <img src={q.image_url} alt="" className="mt-4 rounded-lg border border-gray-200 max-h-96" />}
                {(q.instruction_latin || q.instruction_krill) && (
                    <details className="mt-4 rounded-lg border border-amber-200 bg-amber-50">
                        <summary className="px-4 py-2 text-sm font-medium text-amber-700 cursor-pointer">Qo‘llanmani ko‘rish</summary>
                        <div className="px-4 pb-3 text-sm text-gray-700 whitespace-pre-line">{q.instruction_latin ?? q.instruction_krill}</div>
                    </details>
                )}
                <div className="mt-5 space-y-2">
                    {q.answers.map(a => (
                        <div key={a.id} className={cx('flex items-center gap-3 rounded-lg border px-4 py-3 text-sm', a.is_correct ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 text-gray-800')}>
                            <span className={cx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', a.is_correct ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300')}>{!!a.is_correct && <Check className="w-3 h-3" />}</span>
                            <span>{a.text_latin ?? a.text_krill}{a.text_latin && a.text_krill && <span className="block text-xs opacity-70">{a.text_krill}</span>}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

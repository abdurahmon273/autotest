import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dices, LoaderCircle, Search, X } from 'lucide-react';
import api, { messageOf } from '../api';
import { useDebounce, useList } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { useLightbox } from '../lib/lightbox';
import { Avatar, Badge, Empty, Field, Pagination, Td, Th, THead } from '../components/ui';

function UserPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounce(search);
    const { data, isFetching } = useList('/students/search', { search: q, page });

    if (value) {
        return (
            <div className="form-input flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 truncate"><Avatar name={value.name} size="w-6 h-6 text-[10px]" />{value.name} <span className="text-gray-400">@{value.username}</span></span>
                <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
        );
    }

    return (
        <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-[18px] -translate-y-1/2" />
            <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Ism, username yoki telefon..."
                className="form-input pl-9"
            />
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-64 overflow-y-auto">
                        {isFetching && !data ? <div className="p-3 text-sm text-gray-400">Yuklanmoqda...</div>
                            : data?.data?.length ? data.data.map(u => (
                                <button key={u.id} type="button" onMouseDown={() => { onChange(u); setOpen(false); setSearch(''); }} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50">
                                    <Avatar name={u.name} size="w-7 h-7 text-xs" />
                                    <span className="flex-1 truncate">{u.name}</span>
                                    <span className="text-gray-400">@{u.username}</span>
                                </button>
                            )) : <div className="p-3 text-sm text-gray-400">Topilmadi</div>}
                    </div>
                    <div onMouseDown={e => e.preventDefault()}><Pagination meta={data} onPage={setPage} /></div>
                </div>
            )}
        </div>
    );
}

export default function RandomLogic() {
    const [count, setCount] = useState(20);
    const [user, setUser] = useState(null);
    const toast = useToast();
    const lightbox = useLightbox();

    const gen = useMutation({
        mutationFn: () => api.post('/settings/random-quiz/generate', { count, user_id: user?.id ?? null }).then(r => r.data),
        onError: err => toast.error(messageOf(err)),
    });
    const result = gen.data;

    const perTheme = {};
    result?.questions.forEach(q => q.themes.forEach(t => { perTheme[t.title] = (perTheme[t.title] ?? 0) + 1; }));

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5"><h1 className="text-2xl font-bold text-gray-900">Random logika</h1></div>

            <div className="card p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-4 items-end">
                    <Field label="Savollar soni">
                        <select value={count} onChange={e => setCount(Number(e.target.value))} className="form-input">
                            <option value={20}>20 talik</option>
                            <option value={50}>50 talik</option>
                        </select>
                    </Field>
                    <Field label="Foydalanuvchi" hint="(ixtiyoriy — xato qilgan savollari birinchi olinadi)">
                        <UserPicker value={user} onChange={setUser} />
                    </Field>
                    <button type="button" onClick={() => gen.mutate()} disabled={gen.isPending} className="btn-primary h-[38px]">
                        {gen.isPending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />} Generate
                    </button>
                </div>
            </div>

            {result && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[['Savollar', result.questions.length], ['Mavzular', result.theme_count], ['Mavzudan kamida', result.min_per_theme], ['Mavzudan ko‘pi bilan', result.max_per_theme]].map(([l, v]) => (
                            <div key={l} className="card p-4"><p className="text-xs text-gray-500">{l}</p><p className="text-xl font-semibold text-gray-900 mt-1">{v}</p></div>
                        ))}
                    </div>

                    <div className="card p-4 mb-6 flex flex-wrap gap-2">
                        {Object.entries(perTheme).sort((a, b) => b[1] - a[1]).map(([t, n]) => <Badge key={t} color={n >= result.max_per_theme ? 'amber' : 'blue'}>{t}: {n}</Badge>)}
                    </div>

                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <THead><Th className="w-12">#</Th><Th className="w-16">ID</Th><Th>Savol</Th><Th>Mavzu</Th><Th>To‘g‘ri javob</Th></THead>
                                <tbody className="table-body">
                                    {result.questions.length ? result.questions.map(q => (
                                        <tr key={q.id} className="hover:bg-gray-50">
                                            <Td className="text-gray-400">{q.order}</Td>
                                            <Td className="text-gray-500">{q.id}</Td>
                                            <Td>
                                                <div className="flex items-start gap-3">
                                                    {q.image_url && <img src={q.image_url} onClick={() => lightbox(q.image_url)} className="w-14 h-10 rounded object-cover cursor-zoom-in shrink-0" />}
                                                    <span className="text-gray-900">{q.question}</span>
                                                </div>
                                            </Td>
                                            <Td><div className="flex flex-wrap gap-1">{q.themes.map(t => <Badge key={t.id}>{t.title}</Badge>)}</div></Td>
                                            <Td className="text-green-700">{q.correct ?? '—'}</Td>
                                        </tr>
                                    )) : <Empty colSpan={5} />}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

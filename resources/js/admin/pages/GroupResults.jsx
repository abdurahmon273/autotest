import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ban, ClipboardList, Eye, Layers, LoaderCircle, Send, Users } from 'lucide-react';
import api from '../api';
import { useDebounce } from '../lib/hooks';
import { Badge, Empty, PageHeader, SearchInput, SkeletonRows, Th, THead, Td } from '../components/ui';
import { cx } from '../lib/utils';

const tone = p => (p >= 70 ? 'bg-green-500' : p >= 40 ? 'bg-amber-400' : 'bg-red-400');
export const Bar = ({ value, label, className }) => (
    <div className={cx('min-w-40', className)}>
        <div className="flex items-center justify-between text-sm mb-1"><span className="font-bold text-gray-900">{value}%</span>{label && <span className="text-gray-500">{label}</span>}</div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><div className={cx('h-full rounded-full transition-all', tone(value))} style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
);

export default function GroupResults() {
    const [search, setSearch] = useState('');
    const [activity, setActivity] = useState('');
    const q = useDebounce(search);
    const sentinel = useRef(null);
    const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['/results/groups', { search: q, activity }],
        queryFn: ({ pageParam = 1 }) => api.get('/results/groups', { params: { search: q, activity, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
    });
    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;
    const themesTotal = data?.pages[0]?.themes_total ?? 0;

    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    return (
        <>
            <PageHeader title="Guruhlar bo‘yicha natijalar" />
            <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Guruh nomi..." className="w-72" />
                <select value={activity} onChange={e => setActivity(e.target.value)} className="form-input !w-52 shrink-0">
                    <option value="">Barcha guruhlar</option><option value="active">Vazifa berilganlar</option><option value="idle">Vazifa berilmaganlar</option>
                </select>
                <span className="ml-auto text-sm font-medium text-gray-500">{isFetching && !isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin inline" /> : `${total} ta guruh · ${themesTotal} ta bo‘lim`}</span>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto"><table className="min-w-full">
                    <THead><Th>Guruh</Th><Th className="text-center">O‘quvchilar</Th><Th className="text-center">Vazifalar</Th><Th>Bo‘limlar qamrovi</Th><Th>Vazifa bajarilishi</Th><Th className="text-center">O‘rtacha foiz</Th><Th className="text-right">Amallar</Th></THead>
                    <tbody className="table-body">
                        {isLoading ? <SkeletonRows cols={7} /> : rows.length ? rows.map(g => (
                            <tr key={g.id}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <span className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center"><Layers className="w-5 h-5" /></span>
                                        <div className="min-w-0 max-w-[16rem]">
                                            <Link to={`/admin/results/groups/${g.id}`} title={g.name} className="block text-base font-semibold text-gray-900 hover:text-blue-600 truncate">{g.name}</Link>
                                            <p className="text-sm text-gray-500 flex items-center gap-2 min-w-0"><span className="truncate" title={g.description || ''}>{g.description || '—'}</span>{g.telegram_chat_id && <Send className="w-3.5 h-3.5 text-sky-500 shrink-0" title="Telegram ulangan" />}</p>
                                        </div>
                                    </div>
                                </Td>
                                <Td className="text-center"><span className="text-lg font-bold text-gray-900">{g.students_count}</span>{g.blocked_students > 0 && <span className="block text-xs font-semibold text-red-600"><Ban className="w-3 h-3 inline -mt-0.5" /> {g.blocked_students} bloklangan</span>}</Td>
                                <Td className="text-center"><span className="text-lg font-bold text-gray-900">{g.tasks_count}</span>{g.active_tasks > 0 && <Badge color="green" className="ml-1.5">{g.active_tasks} faol</Badge>}</Td>
                                <Td><Bar value={g.coverage} label={`${g.themes_covered} / ${themesTotal}`} /></Td>
                                <Td>{g.hw_passed + g.hw_failed ? <Bar value={g.pass_rate} label={`${g.hw_passed} ✓ · ${g.hw_failed} ✕`} /> : <span className="text-gray-300">—</span>}</Td>
                                <Td className="text-center">{g.hw_avg ? <Badge color={g.hw_avg >= 70 ? 'green' : g.hw_avg >= 40 ? 'amber' : 'red'} className="!text-base font-bold">{g.hw_avg}%</Badge> : <span className="text-gray-300">—</span>}</Td>
                                <Td><div className="flex items-center justify-end"><Link to={`/admin/results/groups/${g.id}`} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Batafsil"><Eye className="w-4 h-4" /></Link></div></Td>
                            </tr>
                        )) : <Empty colSpan={7} text="Guruhlar topilmadi" />}
                    </tbody>
                </table></div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">{isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : ''}</div>
            </div>
        </>
    );
}

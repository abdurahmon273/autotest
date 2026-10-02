import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Eye, LoaderCircle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../lib/auth';
import { useDebounce, useItem } from '../lib/hooks';
import { Avatar, Badge, Empty, GroupChips, PageHeader, SearchInput, SkeletonRows, Th, THead, Td } from '../components/ui';
import MultiSelect from '../components/MultiSelect';
import ThemeLabel from '../components/ThemeLabel';
import { cx, fmtPhone } from '../lib/utils';

export default function StudentResults() {
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState([]);
    const [themes, setThemes] = useState([]);
    const [kinds, setKinds] = useState(['homework']); // default: uyga vazifalar
    const q = useDebounce(search);
    const KINDS = [{ id: 'exam', label: 'Imtihon (20 / 50 talik)' }, { id: 'homework', label: 'Uyga vazifa' }, { id: 'training', label: 'Mashg‘ulot' }];
    const sentinel = useRef(null);
    const { data: filters } = useItem('/results/filters');

    const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
        queryKey: ['/results/students', { search: q, groups, themes, kinds }],
        queryFn: ({ pageParam = 1 }) => api.get('/results/students', { params: { search: q, groups, themes, kinds, page: pageParam } }).then(r => r.data),
        getNextPageParam: last => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
        initialPageParam: 1,
        placeholderData: p => p,
    });
    const rows = data?.pages.flatMap(p => p.data) ?? [];
    const total = data?.pages[0]?.total ?? 0;

    useEffect(() => {
        if (!sentinel.current || !hasNextPage) return;
        const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: '200px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, rows.length]);

    const groupOpts = (filters?.groups ?? []).map(g => ({ id: g.id, label: g.name }));
    const themeOpts = (filters?.themes ?? []).map(t => ({ id: t.id, label: t.title ?? t.title_krill ?? '', render: <ThemeLabel theme={t} /> }));

    return (
        <>
            <PageHeader title="O‘quvchilar natijalari" />

            <div className="card p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SearchInput value={search} onChange={setSearch} placeholder="Ism, username yoki telefon..." className="w-full" />
                    <MultiSelect value={groups} onChange={setGroups} options={groupOpts} placeholder="Barcha guruhlar" allLabel="Barcha guruhlar" searchPlaceholder="Guruh qidirish..." />
                    <MultiSelect value={themes} onChange={setThemes} options={themeOpts} placeholder="Barcha bo‘limlar" allLabel="Barcha bo‘limlar" searchPlaceholder="Bo‘lim qidirish..." />
                    <MultiSelect value={kinds} onChange={setKinds} options={KINDS} placeholder="Barcha turlar" allLabel="Barcha turlar" searchPlaceholder="Tur..." />
                </div>
                <div className="mt-3 text-right text-sm font-medium text-gray-500">{isFetching && !isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin inline" /> : `${total} ta o‘quvchi`}</div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <THead><Th>O‘quvchi</Th><Th>Guruhlar</Th><Th className="text-center">To‘g‘ri</Th><Th className="text-center">Noto‘g‘ri</Th><Th className="text-center">Jami</Th><Th className="text-center">Foiz</Th><Th className="text-right">Amallar</Th></THead>
                        <tbody className="table-body">
                            {isLoading ? <SkeletonRows cols={7} /> : rows.length ? rows.map(s => {
                                const c = Number(s.correct_sum ?? 0), ic = Number(s.in_correct_sum ?? 0), all = c + ic;
                                const pct = all ? Math.round(c * 100 / all) : 0;
                                return (
                                    <tr key={s.id}>
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <Avatar name={s.name} />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{can('show_student') ? <Link to={`/admin/students/${s.id}`} className="hover:text-blue-600">{s.name}</Link> : s.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{s.username ? `@${s.username}` : ''}{s.username && s.phone ? ' · ' : ''}{s.phone ? fmtPhone(s.phone) : ''}</p>
                                                </div>
                                            </div>
                                        </Td>
                                        <Td><GroupChips groups={s.groups} /></Td>
                                        <Td className="text-center font-semibold text-green-600">{c}</Td>
                                        <Td className="text-center font-semibold text-red-600">{ic}</Td>
                                        <Td className="text-center font-semibold text-gray-800">{all}</Td>
                                        <Td className="text-center">{all ? <Badge color={pct >= 90 ? 'green' : pct >= 70 ? 'amber' : 'red'} className="!text-sm font-semibold">{pct}%</Badge> : <span className="text-gray-300">—</span>}</Td>
                                        <Td><div className="flex items-center justify-end">{can('show_student') && <Link to={`/admin/students/${s.id}`} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="Batafsil"><Eye className="w-4 h-4" /></Link>}</div></Td>
                                    </tr>
                                );
                            }) : <Empty colSpan={7} text="O‘quvchilar topilmadi" />}
                        </tbody>
                    </table>
                </div>
                <div ref={sentinel} className="h-10 flex items-center justify-center text-xs text-gray-400 border-t border-gray-100">
                    {isFetchingNextPage ? <LoaderCircle className="w-4 h-4 animate-spin" /> : !hasNextPage && rows.length > 15 ? 'Hammasi yuklandi' : ''}
                </div>
            </div>
        </>
    );
}

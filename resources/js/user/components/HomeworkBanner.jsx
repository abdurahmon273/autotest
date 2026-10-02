import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ClipboardList } from 'lucide-react';
import api from '../api';
import { useLang } from '../lib';

/** Faol uyga vazifalar: navbar ostida ixcham, katta yozuvli kartalar. Vazifa bo'lmasa hech narsa chiqmaydi. */
export default function HomeworkBanner({ themeId, enabled = true }) {
    const nav = useNavigate();
    const { key } = useLang();
    const { data } = useQuery({ queryKey: ['homeworks', key], queryFn: () => api.get('/homeworks', { params: { lang: key } }).then(r => r.data), enabled, staleTime: 60_000 });
    if (!data?.length) return null;

    return (
        <div className="px-4 md:px-8 pt-4">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                {data.map(h => {
                    // rang: natija yo'q -> qizil, jarayonda -> sariq, bajarildi (count va foiz o'tgan) -> yashil
                    const tone = h.status === 2 ? 'green' : h.tests_count > 0 ? 'amber' : 'red';
                    const current = themeId && Number(themeId) === h.theme_id; // joriy mavzu: solid rang
                    const c = {
                        red: current
                            ? { box: 'border-red-400 bg-red-500 text-white', icon: 'bg-white/20 text-white', pct: 'text-white' }
                            : { box: 'border-red-400/60 bg-red-500/20 hover:bg-red-500/30 text-white', icon: 'bg-red-500 text-white', pct: 'text-red-200' },
                        amber: current
                            ? { box: 'border-amber-300 bg-amber-400 text-gray-900', icon: 'bg-gray-900/10 text-gray-900', pct: 'text-gray-900' }
                            : { box: 'border-amber-300/60 bg-amber-400/20 hover:bg-amber-400/30 text-white', icon: 'bg-amber-400 text-gray-900', pct: 'text-amber-200' },
                        green: current
                            ? { box: 'border-green-400 bg-green-500 text-white', icon: 'bg-white/20 text-white', pct: 'text-white' }
                            : { box: 'border-green-400/60 bg-green-500/20 hover:bg-green-500/30 text-white', icon: 'bg-green-500 text-white', pct: 'text-green-200' },
                    }[tone];
                    return (
                        <button key={h.homework_id} type="button" onClick={() => nav(`/app/theme/${h.theme_id}`)}
                            className={`snap-start shrink-0 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[340px] sm:max-w-[480px] rounded-2xl border-2 px-5 py-4 text-left flex items-center gap-4 transition-colors ${c.box}`}>
                            <span className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center ${c.icon}`}><ClipboardList className="w-6 h-6" /></span>
                            <span className="min-w-0 flex-1 block text-xl font-extrabold leading-tight line-clamp-2">{h.title}</span>
                            <span className={`shrink-0 text-2xl font-extrabold ${c.pct}`}>{h.percentage}%</span>
                            <ChevronRight className="w-6 h-6 shrink-0 opacity-70" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

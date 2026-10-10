import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlignLeft, LogOut, X } from 'lucide-react';
import api, { logout } from '../api';
import { useLang } from '../lib';

/** Yumaloq foiz ko'rsatkichi: halqa to'ldirilishi va o'rtada son. */
function PercentRing({ value }) {
    const v = Math.max(0, Math.min(100, value));
    const color = v >= 90 ? '#4ade80' : v >= 70 ? '#fbbf24' : '#f87171';
    return (
        <span className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${color} ${v * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}>
            <span className="h-8 w-8 rounded-full bg-[#0b1f45] flex items-center justify-center text-[11px] font-bold tabular-nums" style={{ color }}>{v}%</span>
        </span>
    );
}

export default function Layout() {
    const [open, setOpen] = useState(false);
    const nav = useNavigate();
    const appName = document.getElementById('app').dataset.appName;
    const { key } = useLang();
    const { data: themes } = useQuery({ queryKey: ['themes', key], queryFn: () => api.get('/themes', { params: { lang: key } }).then(r => r.data), enabled: open, staleTime: 5 * 60_000 });
    const { data: progress } = useQuery({ queryKey: ['themes-progress'], queryFn: () => api.get('/themes/progress').then(r => r.data), enabled: open && !!themes, staleTime: 5 * 60_000 });
    const { data: homeworks } = useQuery({ queryKey: ['homeworks', key], queryFn: () => api.get('/homeworks', { params: { lang: key } }).then(r => r.data), enabled: open && !!themes, staleTime: 60_000 });

    useEffect(() => {
        const h = e => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="h-16 md:h-20 border-b border-white/60 flex items-center justify-between px-4 md:px-8">
                <button type="button" onClick={() => setOpen(true)} aria-label="Menyu" className="p-2 -m-2 rounded-lg active:bg-white/10 touch-manipulation"><AlignLeft className="w-8 h-8" strokeWidth={2.5} /></button>
                <button type="button" onClick={logout} aria-label="Chiqish" className="p-2 -m-2 rounded-lg active:bg-white/10 touch-manipulation"><LogOut className="w-8 h-8" strokeWidth={2.5} /></button>
            </header>

            <main className="flex-1 flex flex-col"><Outlet /></main>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
                    <div className="relative w-full h-full sm:max-w-md sm:h-[calc(100dvh-2rem)] sm:rounded-2xl bg-[#0b1f45] text-white border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-pop">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <Link to="/app" onClick={() => setOpen(false)} className="text-2xl font-extrabold text-white">{appName}</Link>
                            <button type="button" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-4 pb-4">
                            <Link to="/app" onClick={() => setOpen(false)} className="block rounded-xl bg-[#3b5bdb] hover:bg-[#4c6cf0] px-4 py-3 text-center text-[15px] font-bold transition-colors">Tezkor imtihon</Link>
                        </div>
                        {homeworks?.length > 0 && (
                            <>
                                <p className="px-6 pb-3 text-sm font-semibold text-white/60 border-b border-white/10">Uyga vazifalar</p>
                                <div className="p-4 space-y-2 border-b border-white/10 max-h-[40vh] overflow-y-auto">
                                    {homeworks.map(h => (
                                        <button key={h.homework_id} type="button" onClick={() => { setOpen(false); nav(`/app/theme/${h.theme_id}`); }}
                                            className="w-full rounded-xl border border-amber-300/30 bg-amber-400/10 hover:bg-amber-400/20 px-4 py-3 text-left transition-colors">
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="text-[15px] font-medium truncate">{h.title}</span>
                                                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${h.status === 2 ? 'bg-green-500/30 text-green-200' : h.status === 0 ? 'bg-brand-red/30 text-red-200' : 'bg-white/10 text-white/70'}`}>{h.percentage}%</span>
                                            </span>
                                            <span className="mt-1 block text-xs text-white/50 truncate">{h.theme_title} · {h.tests_count}/{h.min_test_count} test · min {h.passing_percentage}%</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        <p className="px-6 pb-3 pt-3 text-sm font-semibold text-white/60 border-b border-white/10">Bo‘lim testlari</p>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {themes ? themes.map(t_ => (
                                <button key={t_.id} type="button" onClick={() => { setOpen(false); nav(`/app/theme/${t_.id}`); }}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 hover:border-[#5b7cff] hover:bg-white/10 px-4 py-3 text-left text-[15px] font-medium flex items-center gap-3 transition-colors">
                                    {(t_.icon_url || (t_.icon_type === 0 && t_.icon)) && (
                                        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">
                                            {t_.icon_url ? <img src={t_.icon_url} alt="" className="w-6 h-6 rounded object-cover" /> : t_.icon}
                                        </span>
                                    )}
                                    <span className="flex-1 min-w-0">{t_.title}</span>
                                    {progress?.[t_.id] > 0 && <PercentRing value={progress[t_.id]} />}
                                </button>
                            )) : Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/10 animate-pulse" />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

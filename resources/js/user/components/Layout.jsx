import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlignLeft, LogOut, X } from 'lucide-react';
import api, { logout } from '../api';
import { useLang } from '../lib';

export default function Layout() {
    const [open, setOpen] = useState(false);
    const nav = useNavigate();
    const appName = document.getElementById('app').dataset.appName;
    const { key } = useLang();
    const { data: themes } = useQuery({ queryKey: ['themes', key], queryFn: () => api.get('/themes', { params: { lang: key } }).then(r => r.data), enabled: open, staleTime: 5 * 60_000 });

    useEffect(() => {
        const h = e => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="h-20 border-b border-white/60 flex items-center justify-between px-8">
                <button type="button" onClick={() => setOpen(true)} aria-label="Menyu"><AlignLeft className="w-8 h-8" strokeWidth={2.5} /></button>
                <button type="button" onClick={logout} aria-label="Chiqish"><LogOut className="w-8 h-8" strokeWidth={2.5} /></button>
            </header>

            <main className="flex-1 flex flex-col"><Outlet /></main>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
                    <div className="relative w-full max-w-md h-[calc(100vh-3rem)] rounded-2xl bg-[#0b1f45] text-white border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-pop">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <Link to="/app" onClick={() => setOpen(false)} className="text-2xl font-extrabold text-white">{appName}</Link>
                            <button type="button" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-4 pb-4">
                            <Link to="/app" onClick={() => setOpen(false)} className="block rounded-xl bg-[#3b5bdb] hover:bg-[#4c6cf0] px-4 py-3 text-center text-[15px] font-bold transition-colors">Tezkor imtihon</Link>
                        </div>
                        <p className="px-6 pb-3 text-sm font-semibold text-white/60 border-b border-white/10">Bo‘lim testlari</p>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {themes ? themes.map(t_ => (
                                <button key={t_.id} type="button" onClick={() => { setOpen(false); nav(`/app/theme/${t_.id}`); }}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 hover:border-[#5b7cff] hover:bg-white/10 px-4 py-3 text-left text-[15px] font-medium flex items-center gap-3 transition-colors">
                                    {(t_.icon_url || (t_.icon_type === 0 && t_.icon)) && (
                                        <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">
                                            {t_.icon_url ? <img src={t_.icon_url} alt="" className="w-6 h-6 rounded object-cover" /> : t_.icon}
                                        </span>
                                    )}
                                    <span>{t_.title}</span>
                                </button>
                            )) : Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/10 animate-pulse" />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

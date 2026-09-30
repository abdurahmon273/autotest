import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, ClipboardList, Cog, Home, UserCheck, Briefcase, ChevronDown, CircleHelp, FileQuestion, GraduationCap, KeyRound, LayoutDashboard, Layers, LogOut, Menu, Send, Settings, ShieldCheck, User, UserCog, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';
import { cx } from '../lib/utils';

const item = ({ isActive }) => cx(isActive ? 'active bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100', 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors');

const MAIN = [
    ['access_dashboard', '/admin', LayoutDashboard, 'Dashboard', true],
    ['access_teacher', '/admin/teachers', GraduationCap, 'Ustozlar'],
    ['access_student', '/admin/students', Users, 'Studentlar'],
    ['access_student', '/admin/results/students', UserCheck, 'O‘quvchi natijalari'],
    ['access_student', '/admin/results/themes', BarChart3, 'Bo‘lim bo‘yicha natijalar'],
    ['access_student', '/admin/results/by-student', ClipboardList, 'O‘quvchi bo‘yicha natijalar'],
];
const STUDY = [
    ['access_group', '/admin/groups', Layers, 'Guruhlar'],
    ['access_task', '/admin/homeworks', Home, 'Uyga vazifalar'],
    ['access_test', '/admin/tests', FileQuestion, 'Testlar'],
    ['access_test', '/admin/active-users', Activity, 'Faol foydalanuvchilar'],
    ['access_student', '/admin/students-manage', UserCog, 'O‘quvchilar boshqaruvi'],
];
const BASE = [
    ['access_question', '/admin/questions', CircleHelp, 'Savollar'],
    ['access_theme', '/admin/themes', BookOpen, 'Mavzular'],
];
const SETTINGS = [
    ['access_role', '/admin/roles', ShieldCheck, 'Rollar'],
    ['access_permission', '/admin/permissions', KeyRound, 'Ruxsatlar'],
    ['access_staff', '/admin/staff', Briefcase, 'Hodimlar'],
    ['access_telegram_setting', '/admin/settings/telegram', Send, 'Telegram sozlamalari'],
    ['access_general_setting', '/admin/settings/general', Cog, 'Umumiy sozlamalar'],
];

const Nav = ({ items, can, onClick }) => (
    <ul className="space-y-0.5">
        {items.filter(([p]) => can(p)).map(([, to, Icon, label, end]) => (
            <li key={to}><NavLink to={to} end={end} className={item} onClick={onClick}><Icon className="w-4 h-4 shrink-0" /><span>{label}</span></NavLink></li>
        ))}
    </ul>
);

export default function Layout() {
    const { user, can, loading, logout } = useAuth();
    const { pathname } = useLocation();
    const [mobile, setMobile] = useState(false);
    const [menu, setMenu] = useState(false);
    const settingsActive = /^\/admin\/(roles|permissions|staff|settings)/.test(pathname);
    const [settingsOpen, setSettingsOpen] = useState(settingsActive);

    useEffect(() => { if (settingsActive) setSettingsOpen(true); }, [settingsActive]);
    useEffect(() => {
        const h = e => !e.target.closest('#user-menu') && setMenu(false);
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    if (loading) return null;
    if (!user) return <Navigate to="/admin/login" replace />;

    const appName = document.getElementById('app').dataset.appName;

    return (
        <>
            <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-40">
                <div className="h-full flex items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden p-2 rounded-md hover:bg-gray-100" onClick={() => setMobile(true)}><Menu className="w-5 h-5 text-gray-600" /></button>
                        <NavLink to="/admin" className="text-2xl font-black tracking-tight text-gray-900 italic">{appName}</NavLink>
                    </div>
                    <div className="relative" id="user-menu">
                        <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100">
                            <Avatar name={user.name} />
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
                        </button>
                        {menu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black/5 py-1 z-50 animate-dropdown-enter">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                <NavLink to="/admin/profile" onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><User className="w-4 h-4" /> Profil</NavLink>
                                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"><LogOut className="w-4 h-4" /> Chiqish</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex pt-16 min-h-screen">
                <aside className={cx('fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-200 lg:translate-x-0', mobile ? 'translate-x-0' : '-translate-x-full')}>
                    <nav className="p-3">
                        <Nav items={MAIN} can={can} onClick={() => setMobile(false)} />
                        {(can('access_test') || can('access_group') || can('access_task')) && (
                            <>
                                <div className="my-3 border-t border-gray-200" />
                                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">O‘quv bo‘limi</p>
                                <Nav items={STUDY} can={can} onClick={() => setMobile(false)} />
                            </>
                        )}
                        {(can('access_question') || can('access_theme')) && (
                            <>
                                <div className="my-3 border-t border-gray-200" />
                                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Baza</p>
                                <Nav items={BASE} can={can} onClick={() => setMobile(false)} />
                            </>
                        )}
                        {can('access_settings') && (
                            <>
                                <div className="my-3 border-t border-gray-200" />
                                <button onClick={() => setSettingsOpen(o => !o)} className={cx(settingsOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100', 'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors')}>
                                    <span className="flex items-center gap-3"><Settings className="w-4 h-4" /> Sozlamalar</span>
                                    <ChevronDown className={cx('w-4 h-4 transition-transform', settingsOpen && 'rotate-180')} />
                                </button>
                                {settingsOpen && <div className="mt-0.5 ml-4 pl-3 border-l border-gray-200"><Nav items={SETTINGS} can={can} onClick={() => setMobile(false)} /></div>}
                            </>
                        )}
                    </nav>
                </aside>
                {mobile && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobile(false)} />}
                <main className="flex-1 min-w-0 lg:ml-64 p-6"><Outlet /></main>
            </div>
        </>
    );
}

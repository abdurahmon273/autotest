import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Inbox, LoaderCircle, Save, Search, SquarePen, Trash2 } from 'lucide-react';
import { cx } from '../lib/utils';

export const PageHeader = ({ title, children }) => (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
);

const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', gray: 'bg-gray-100 text-gray-700', purple: 'bg-purple-50 text-purple-700', amber: 'bg-amber-50 text-amber-700' };
export const Badge = ({ color = 'blue', className, children }) => (
    <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', colors[color], className)}>{children}</span>
);

export const Avatar = ({ name, size = 'w-8 h-8 text-xs' }) => (
    <span className={cx('rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold shrink-0', size)}>{(name || '?').trim().charAt(0).toUpperCase()}</span>
);

export const Empty = ({ colSpan, text = 'Ma’lumot topilmadi' }) => (
    <tr><td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-gray-400"><Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />{text}</td></tr>
);

export const SkeletonRows = ({ cols, rows = 6 }) =>
    Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="table-td"><div className={cx('h-3.5 rounded bg-gray-200', j === 0 ? 'w-8' : j === cols - 1 ? 'w-16 ml-auto' : 'w-3/4')} /></td>
            ))}
        </tr>
    ));

export const SkeletonBlock = ({ className = 'h-4 w-1/2' }) => <div className={cx('rounded bg-gray-200 animate-pulse', className)} />;

export const SearchInput = ({ value, onChange, placeholder = 'Qidirish...', className = 'w-64' }) => (
    <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cx('form-input pl-9', className)} />
    </div>
);

export const Field = ({ label, error, hint, children, className }) => (
    <div className={className}>
        {label && <label className="form-label">{label}{hint && <span className="text-gray-400 font-normal"> {hint}</span>}</label>}
        {children}
        {error && <span className="text-red-600 text-xs">{Array.isArray(error) ? error[0] : error}</span>}
    </div>
);

export const Input = ({ error, className, ...p }) => <input className={cx('form-input', className)} {...p} />;

export const SaveButton = ({ saving, children = 'Saqlash', icon: Icon = Save, className = 'btn-primary', ...p }) => (
    <button type="submit" className={className} disabled={saving} {...p}>
        {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {children}
    </button>
);

export const BackLink = ({ to, children = 'Orqaga' }) => <Link to={to} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> {children}</Link>;

export const Actions = ({ show, edit, onEdit, onDelete, extra }) => (
    <div className="flex items-center justify-end gap-1">
        {show && <Link to={show} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Eye className="w-4 h-4" /></Link>}
        {extra}
        {edit && <Link to={edit} className="icon-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50"><SquarePen className="w-4 h-4" /></Link>}
        {onEdit && <button type="button" onClick={onEdit} className="icon-btn text-blue-500 hover:text-blue-700 hover:bg-blue-50"><SquarePen className="w-4 h-4" /></button>}
        {onDelete && <button type="button" onClick={onDelete} className="icon-btn text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>}
    </div>
);

export const Pagination = ({ meta, onPage }) => {
    if (!meta || meta.last_page <= 1) return null;
    const { current_page: c, last_page: l } = meta;
    const pages = [...new Set([1, c - 1, c, c + 1, l].filter(p => p >= 1 && p <= l))];
    return (
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">{meta.from ?? 0}–{meta.to ?? 0} / {meta.total}</span>
            <div className="flex gap-1">
                <button disabled={c <= 1} onClick={() => onPage(c - 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">‹</button>
                {pages.map((p, i) => (
                    <span key={p} className="flex gap-1">
                        {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-gray-400">…</span>}
                        <button onClick={() => onPage(p)} className={cx('px-3 py-1 rounded border', p === c ? 'bg-admin-primary text-white border-admin-primary' : 'border-gray-200 hover:bg-gray-50')}>{p}</button>
                    </span>
                ))}
                <button disabled={c >= l} onClick={() => onPage(c + 1)} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">›</button>
            </div>
        </div>
    );
};

export const Table = ({ head, cols, loading, rows, empty, render, meta, onPage }) => (
    <div className="card">
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="border-b border-gray-200"><tr>{head}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? <SkeletonRows cols={cols} /> : rows?.length ? rows.map(render) : <Empty colSpan={cols} text={empty} />}
                </tbody>
            </table>
        </div>
        <Pagination meta={meta} onPage={onPage} />
    </div>
);

export const Th = ({ children, className }) => <th className={cx('table-th', className)}>{children}</th>;
export const Td = ({ children, className }) => <td className={cx('table-td', className)}>{children}</td>;

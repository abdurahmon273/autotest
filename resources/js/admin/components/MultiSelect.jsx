import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cx } from '../lib/utils';

/**
 * Ko'p tanlovli select. value — id lar massivi; bo'sh massiv = "Barchasi".
 * options: [{ id, label, render? }]
 */
export default function MultiSelect({ value, onChange, options, placeholder = 'Barchasi', allLabel = 'Barchasi', searchPlaceholder = 'Qidirish...', className }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const box = useRef(null);
    const input = useRef(null);

    useEffect(() => {
        const h = e => { if (!box.current?.contains(e.target)) { setOpen(false); setQ(''); } };
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    const selected = options.filter(o => value.includes(o.id));
    const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
    const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);

    return (
        <div ref={box} className={cx('relative', className)}>
            <div onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0); }}
                className="form-input min-h-[38px] flex flex-wrap items-center gap-1 cursor-text pr-8 py-1">
                {selected.length === 0 && !q && <span className="text-gray-700 text-sm px-1">{open ? '' : placeholder}</span>}
                {selected.map(o => (
                    <span key={o.id} className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 text-xs font-medium max-w-48">
                        <span className="truncate">{o.render ?? o.label}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); toggle(o.id); }} className="text-blue-400 hover:text-blue-700"><X className="w-3 h-3" /></button>
                    </span>
                ))}
                {open && <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (filtered.length === 1) { toggle(filtered[0].id); setQ(''); } } if (e.key === 'Backspace' && !q && selected.length) toggle(selected[selected.length - 1].id); }}
                    placeholder={searchPlaceholder} className="flex-1 min-w-24 bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none placeholder-gray-400" />}
                <ChevronDown className={cx('w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform', open && 'rotate-180')} />
            </div>
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <button type="button" onClick={() => { onChange([]); setQ(''); }} className={cx('w-full px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-50 border-b border-gray-100', value.length === 0 ? 'text-blue-700 font-medium' : 'text-gray-700')}>
                        {allLabel}{value.length === 0 && <Check className="w-4 h-4" />}
                    </button>
                    <div className="max-h-64 overflow-y-auto">
                        {filtered.length ? filtered.map(o => {
                            const on = value.includes(o.id);
                            return (
                                <button key={o.id} type="button" onClick={() => toggle(o.id)} className={cx('w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:bg-gray-50', on ? 'bg-blue-50/60 text-blue-700' : 'text-gray-800')}>
                                    <span className="truncate">{o.render ?? o.label}</span>{on && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                            );
                        }) : <p className="px-3 py-2 text-sm text-gray-400">Topilmadi</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

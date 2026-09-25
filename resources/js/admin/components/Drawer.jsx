import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, children, footer }) {
    useEffect(() => {
        if (!open) return;
        const h = e => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col animate-slide-in">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X className="w-5 h-5" /></button>
                </div>
                {children}
                {footer && <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">{footer}</div>}
            </div>
        </div>
    );
}

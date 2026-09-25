import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

const Ctx = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
    const [message, setMessage] = useState(null);
    const resolver = useRef(null);

    const confirm = msg => new Promise(resolve => {
        resolver.current = resolve;
        setMessage(msg);
    });

    const close = ok => {
        setMessage(null);
        resolver.current?.(ok);
        resolver.current = null;
    };

    useEffect(() => {
        if (!message) return;
        const h = e => e.key === 'Escape' && close(false);
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [message]);

    return (
        <Ctx.Provider value={confirm}>
            {children}
            {message && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
                    <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                            <TriangleAlert className="h-6 w-6 text-red-600" />
                        </div>
                        <p className="text-sm text-gray-800">{message}</p>
                        <div className="mt-6 flex justify-center gap-3">
                            <button type="button" className="btn-secondary" onClick={() => close(false)}>Bekor qilish</button>
                            <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => close(true)} autoFocus>Tasdiqlash</button>
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}

export const useConfirm = () => useContext(Ctx);

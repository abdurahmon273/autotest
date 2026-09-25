import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const Ctx = createContext(() => {});

export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);

    const toast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setItems(l => [...l, { id, message, type }]);
        setTimeout(() => setItems(l => l.filter(t => t.id !== id)), 5000);
    }, []);

    return (
        <Ctx.Provider value={toast}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm w-full">
                {items.map(t => (
                    <div key={t.id} className={`${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} border rounded-lg p-4 shadow-lg flex items-center gap-3`}>
                        {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                        <p className="text-sm font-medium flex-1">{t.message}</p>
                        <button onClick={() => setItems(l => l.filter(x => x.id !== t.id))}><X className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
        </Ctx.Provider>
    );
}

export const useToast = () => useContext(Ctx);

import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext(() => {});

export function LightboxProvider({ children }) {
    const [src, setSrc] = useState(null);

    useEffect(() => {
        if (!src) return;
        const h = e => e.key === 'Escape' && setSrc(null);
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [src]);

    return (
        <Ctx.Provider value={setSrc}>
            {children}
            {src && (
                <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out" onClick={() => setSrc(null)}>
                    <img src={src} alt="" className="max-w-full max-h-full rounded-lg shadow-2xl" />
                </div>
            )}
        </Ctx.Provider>
    );
}

export const useLightbox = () => useContext(Ctx);

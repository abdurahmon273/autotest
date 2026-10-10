import { useEffect, useRef, useState } from 'react';

/**
 * Rasm bosilsa to'liq ekranda ochiladi; ikki barmoq bilan kattalashtirish va surish — faqat CSS transform,
 * tashqi kutubxona yo'q, so'rov yo'q (o'sha rasm URL, brauzer keshidan). Rasmga yana bosilsa yopiladi.
 */
export default function ZoomImage({ src, className }) {
    const [open, setOpen] = useState(false);
    if (!src) return null;
    return (
        <>
            <img src={src} alt="" className={className} onClick={() => setOpen(true)} />
            {open && <Viewer src={src} onClose={() => setOpen(false)} />}
        </>
    );
}

function Viewer({ src, onClose }) {
    const img = useRef(null);
    const t = useRef({ s: 1, x: 0, y: 0 });         // joriy transform
    const g = useRef(null);                           // ishora holati
    const moved = useRef(false);

    const apply = () => { const { s, x, y } = t.current; if (img.current) img.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
    const dist = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    const mid = ts => ({ x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 });

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const esc = e => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', esc);
        return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc); };
    }, [onClose]);

    const onTouchStart = e => {
        moved.current = false;
        const ts = e.touches;
        if (ts.length === 2) g.current = { type: 'pinch', d0: dist(ts), s0: t.current.s, m0: mid(ts), x0: t.current.x, y0: t.current.y };
        else if (ts.length === 1) g.current = { type: 'pan', px: ts[0].clientX, py: ts[0].clientY, x0: t.current.x, y0: t.current.y };
    };
    const onTouchMove = e => {
        const ts = e.touches, gs = g.current;
        if (!gs) return;
        e.preventDefault();
        if (gs.type === 'pinch' && ts.length === 2) {
            const s = Math.min(6, Math.max(1, gs.s0 * dist(ts) / gs.d0));
            const m = mid(ts);
            // kattalashtirish barmoqlar o'rtasiga nisbatan
            t.current = { s, x: gs.x0 + (m.x - gs.m0.x) + (m.x - window.innerWidth / 2) * (1 - s / gs.s0), y: gs.y0 + (m.y - gs.m0.y) + (m.y - window.innerHeight / 2) * (1 - s / gs.s0) };
            moved.current = true;
        } else if (gs.type === 'pan' && ts.length === 1 && t.current.s > 1) {
            const dx = ts[0].clientX - gs.px, dy = ts[0].clientY - gs.py;
            if (Math.abs(dx) + Math.abs(dy) > 6) moved.current = true;
            t.current = { ...t.current, x: gs.x0 + dx, y: gs.y0 + dy };
        }
        apply();
    };
    const onTouchEnd = e => {
        if (e.touches.length === 0) {
            if (t.current.s <= 1.02) { t.current = { s: 1, x: 0, y: 0 }; apply(); }
            g.current = null;
        } else if (e.touches.length === 1) {
            g.current = { type: 'pan', px: e.touches[0].clientX, py: e.touches[0].clientY, x0: t.current.x, y0: t.current.y };
        }
    };
    // Bosish: surilmagan bo'lsa yopiladi. Sichqoncha g'ildiragi: kattalashtirish (desktop).
    const onClick = () => { if (!moved.current) onClose(); moved.current = false; };
    const onWheel = e => { e.preventDefault(); const s = Math.min(6, Math.max(1, t.current.s * (e.deltaY < 0 ? 1.15 : 0.87))); t.current = s === 1 ? { s: 1, x: 0, y: 0 } : { ...t.current, s }; apply(); };

    return (
        <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center select-none" style={{ touchAction: 'none' }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd} onClick={onClick} onWheel={onWheel}>
            <img ref={img} src={src} alt="" draggable={false} className="max-w-full max-h-full object-contain will-change-transform" style={{ transformOrigin: 'center center' }} />
        </div>
    );
}

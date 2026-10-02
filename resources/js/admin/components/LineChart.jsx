import { useMemo, useState } from 'react';

const DEFAULT_COLORS = ['#2a78d6', '#eb6834'];
const W = 1000;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 32, left: 48 };

const fmtDay = d => { const [, m, day] = d.split('-'); return `${day}.${m}`; };

/**
 * Oddiy chiziqli chart: 1–2 seriya, bitta o'q, nuqtalar, hover tooltip.
 * series: [{ key, label, unit? }], data: [{ date, [key]: number|null }]
 */
export default function LineChart({ title, data, series, max: fixedMax, colors = DEFAULT_COLORS }) {
    const COLORS = colors;
    const [hover, setHover] = useState(null);

    const { max, points, xs } = useMemo(() => {
        const values = data.flatMap(d => series.map(s => d[s.key]).filter(v => v !== null && v !== undefined));
        const max = fixedMax ?? Math.max(5, ...values);
        const n = data.length;
        const xs = data.map((_, i) => PAD.left + (n > 1 ? (i * (W - PAD.left - PAD.right)) / (n - 1) : 0));
        const y = v => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
        const points = series.map(s => data.map((d, i) => (d[s.key] === null || d[s.key] === undefined ? null : { x: xs[i], y: y(d[s.key]), v: d[s.key] })));
        return { max, points, xs };
    }, [data, series, fixedMax]);

    const path = pts => pts.filter(Boolean).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    const ticks = [0, 0.5, 1].map(t => Math.round(max * t));
    const yOf = v => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
    const labelEvery = Math.ceil(data.length / 6);

    const onMove = e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0;
        xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(xs[best] - x)) best = i; });
        setHover(best);
    };

    const hd = hover !== null ? data[hover] : null;
    const tipLeft = hover !== null ? (xs[hover] / W) * 100 : 0;

    return (
        <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                {series.length > 1 && <div className="flex items-center gap-4 text-xs text-gray-500">
                    {series.map((s, i) => <span key={s.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />{s.label}</span>)}
                </div>}
            </div>
            <div className="relative">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                    {ticks.map(t => (
                        <g key={t}>
                            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="#e5e7eb" strokeWidth="1" />
                            <text x={PAD.left - 10} y={yOf(t) + 5} textAnchor="end" fontSize="14" fill="#9ca3af">{t}</text>
                        </g>
                    ))}
                    {data.map((d, i) => i % labelEvery === 0 && <text key={d.date} x={xs[i]} y={H - 8} textAnchor="middle" fontSize="14" fill="#9ca3af">{fmtDay(d.date)}</text>)}
                    {hover !== null && <line x1={xs[hover]} x2={xs[hover]} y1={PAD.top} y2={H - PAD.bottom} stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 3" />}
                    {points.map((pts, i) => (
                        <g key={series[i].key}>
                            <path d={path(pts)} fill="none" stroke={COLORS[i]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                            {pts.map((p, j) => p && <circle key={j} cx={p.x} cy={p.y} r={hover === j ? 6 : 3.5} fill={COLORS[i]} stroke="#fff" strokeWidth="2" />)}
                        </g>
                    ))}
                </svg>
                {hd && (
                    <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg whitespace-nowrap" style={{ left: `${tipLeft}%` }}>
                        <span className="text-gray-400">{fmtDay(hd.date)}</span>
                        {series.map((s, i) => <span key={s.key} className="ml-2 font-bold">{hd[s.key] ?? '—'}{hd[s.key] !== null && hd[s.key] !== undefined ? s.unit ?? '' : ''}</span>)}
                    </div>
                )}
            </div>
        </div>
    );
}

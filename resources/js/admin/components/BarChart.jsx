import { useState } from 'react';

const W = 1000;
const H = 300;
const PAD = { top: 24, right: 20, bottom: 70, left: 48 };

/** Oddiy ustunli chart: x — nomlar, y — foiz (0–100). Hover da to'liq nom va qiymat. */
export default function BarChart({ title, data, color = '#2a78d6', max = 100, unit = '%' }) {
    const [hover, setHover] = useState(null);
    const n = data.length;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const slot = n ? innerW / n : innerW;
    const barW = Math.min(40, slot * 0.6);
    const yOf = v => PAD.top + innerH * (1 - v / max);
    const ticks = [0, 0.5, 1].map(t => Math.round(max * t));
    const short = t => (t.length > 14 ? t.slice(0, 13) + '…' : t);

    return (
        <div className="card p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
            <div className="relative">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseLeave={() => setHover(null)}>
                    {ticks.map(t => (
                        <g key={t}>
                            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="#e5e7eb" strokeWidth="1" />
                            <text x={PAD.left - 10} y={yOf(t) + 5} textAnchor="end" fontSize="14" fill="#9ca3af">{t}{unit}</text>
                        </g>
                    ))}
                    {data.map((d, i) => {
                        const cx = PAD.left + slot * i + slot / 2;
                        const y = yOf(d.value);
                        return (
                            <g key={d.id ?? i} onMouseEnter={() => setHover(i)}>
                                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
                                <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(0, yOf(0) - y)} rx="4" fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
                                {d.value > 0 && <text x={cx} y={y - 8} textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">{d.value}{unit}</text>}
                                <text x={cx} y={H - PAD.bottom + 22} textAnchor="middle" fontSize="12" fill="#6b7280" transform={n > 8 ? `rotate(-30 ${cx} ${H - PAD.bottom + 22})` : undefined}>{short(d.label)}</text>
                            </g>
                        );
                    })}
                </svg>
                {hover !== null && (
                    <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg whitespace-nowrap" style={{ left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%` }}>
                        <span className="text-gray-400">{data[hover].label}</span><span className="ml-2 font-bold">{data[hover].value}{unit}</span>{data[hover].hint && <span className="ml-2 text-gray-400">{data[hover].hint}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

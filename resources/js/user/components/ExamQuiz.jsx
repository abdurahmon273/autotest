import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Lightbulb, LoaderCircle, RotateCcw, X } from 'lucide-react';
import api from '../api';
import { useLang } from '../lib';
import ZoomImage from './ZoomImage';

const cx = (...a) => a.filter(Boolean).join(' ');
const FINISHED = 1;

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function ResultRing({ correct, total, passed }) {
    const percent = total ? Math.round(correct * 100 / total) : 0;
    const color = passed ? '#16a34a' : '#dc2626';
    return (
        <div className="mx-auto h-40 w-40 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, #e5e7eb 0deg)` }}>
            <div className="h-32 w-32 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold" style={{ color }}>{percent}%</span>
                <span className="text-sm font-semibold text-gray-500">{correct} / {total}</span>
            </div>
        </div>
    );
}

export default function ExamQuiz({ data, onRetry }) {
    const [q, setQ] = useState(data);
    const [idx, setIdx] = useState(0);
    const [confirm, setConfirm] = useState(null);
    const [modal, setModal] = useState(false);
    const [tips, setTips] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(data.seconds_left ?? 0);
    const [waiting, setWaiting] = useState(false);
    const tipsRef = useRef(null);
    const waitRef = useRef(null);
    const spentRef = useRef({});
    const [order, setOrder] = useState({});
    const username = document.getElementById('app').dataset.user;
    const { langs, key, set: setLang, multi } = useLang();
    const [texts, setTexts] = useState(() => ({ [data.lang]: Object.fromEntries(data.questions.map(x => [x.id, x])) }));
    const [loadingLang, setLoadingLang] = useState(false);

    const finished = q.status === FINISHED;

    useEffect(() => {
        if (texts[key] || loadingLang) return;
        setLoadingLang(true);
        api.get(`/results/${data.id}/texts`, { params: { lang: key } }).then(r => setTexts(t => ({ ...t, [key]: Object.fromEntries(r.data.map(x => [x.id, x])) }))).finally(() => setLoadingLang(false));
    }, [key, texts, data.id, loadingLang]);

    useEffect(() => {
        if (finished) return;
        const h = e => { if (window.__forceLeave) return; e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [finished]);

    useEffect(() => { if (data.default_image) { const im = new Image(); im.src = data.default_image; } }, [data.default_image]);

    useEffect(() => {
        if (!tips) return;
        const h = e => !tipsRef.current?.contains(e.target) && setTips(false);
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [tips]);

    useEffect(() => { setTips(false); }, [idx]);

    useEffect(() => {
        const ids = q.questions[idx].answers.map(a => a.id);
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        setOrder(o => ({ ...o, [q.questions[idx].id]: ids }));
    }, [idx]);

    const finish = useMutation({
        mutationFn: () => api.post(`/results/${q.id}/finish`).then(r => r.data),
        onSuccess: res => { setQ(x => ({ ...x, ...res })); setConfirm(null); setModal(true); },
    });

    useEffect(() => {
        if (finished || !q.ends_at) return;
        const endsAt = new Date(q.ends_at).getTime();
        const tick = () => {
            const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left === 0) { clearInterval(t); finish.mutate(); }
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [q.ends_at, finished]);

    useEffect(() => () => clearTimeout(waitRef.current), []);

    const base = q.questions[idx];

    useEffect(() => {
        if (finished || base.status !== 0) return;
        const id = base.id;
        const startedAt = Date.now();
        return () => { spentRef.current[id] = (spentRef.current[id] ?? 0) + (Date.now() - startedAt) / 1000; };
    }, [base.id, base.status, finished]);

    const shownAtRef = useRef(Date.now());
    useEffect(() => { shownAtRef.current = Date.now(); }, [base.id]);
    const timeSpent = id => Math.round((spentRef.current[id] ?? 0) + (base.id === id ? (Date.now() - shownAtRef.current) / 1000 : 0));
    const tx = texts[key]?.[base.id] ?? texts[data.lang]?.[base.id] ?? base;
    const ordered = order[base.id] ? [...base.answers].sort((a, b) => order[base.id].indexOf(a.id) - order[base.id].indexOf(b.id)) : base.answers;
    const cur = { ...base, question: tx.question, instruction: tx.instruction, answers: ordered.map(a => ({ ...a, text: tx.answers.find(x => x.id === a.id)?.text ?? a.text })) };
    const done = cur.status !== 0;

    const goNext = questions => {
        const next = questions.findIndex((x, i) => i > idx && x.status === 0);
        const any = questions.findIndex(x => x.status === 0);
        if (next !== -1) setIdx(next); else if (any !== -1) setIdx(any);
    };

    const answer = useMutation({
        mutationFn: answerId => api.post(`/results/${q.id}/answer`, { question_id: cur.id, answer_id: answerId, time: timeSpent(cur.id) }).then(r => r.data),
        onSuccess: (res, answerId) => {
            const questions = q.questions.map(x => x.id === cur.id ? { ...x, status: res.is_correct ? 1 : 2, user_answer_id: answerId, correct_answer_id: res.correct_answer_id } : x);
            const next = { ...q, ...res.result, questions };
            setQ(next);
            setConfirm(null);
            if (res.result.status === FINISHED) { setModal(true); return; }
            setWaiting(true);
            waitRef.current = setTimeout(() => { setWaiting(false); goNext(questions); }, (q.wait_time ?? 2) * 1000);
        },
        onError: err => {
            setConfirm(null);
            if (err.response?.status === 422) finish.mutate();
        },
    });

    const pick = a => {
        if (done || finished || answer.isPending || waiting) return;
        setConfirm(a);
    };

    const answerClass = a => {
        if (!done) return confirm?.id === a.id ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-transparent hover:bg-[#4a4f55]';
        if (a.id === cur.correct_answer_id) return 'border-transparent !bg-green-600';
        if (a.id === cur.user_answer_id) return 'border-transparent !bg-brand-red';
        return 'border-transparent opacity-70';
    };

    const numClass = x => cx('h-9 w-9 rounded border text-sm font-semibold', x.id === cur.id ? 'ring-2 ring-white' : '', x.status === 1 ? 'bg-green-600 border-green-500' : x.status === 2 ? 'bg-brand-red border-brand-red' : 'bg-white/10 border-white/40 hover:bg-white/20');

    const timerUrgent = !finished && secondsLeft <= 60;

    return (
        <div className="flex-1 px-4 md:px-16 py-6 md:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
                <div className="flex items-center gap-3">
                    {finished && !q.is_passed && <button type="button" onClick={onRetry} className="rounded bg-white/15 border border-white/40 px-4 py-2 text-base md:text-lg font-medium flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Qayta urinish</button>}
                    {multi && langs.map(l => <button key={l.key} type="button" onClick={() => setLang(l.key)} disabled={loadingLang} className={cx('rounded border border-white/40 px-4 md:px-5 py-2 text-base md:text-lg', key === l.key ? 'bg-[#1e3a8a]' : 'bg-gray-500/80')}>{l.key === 'krill' ? 'Кирил' : 'Lotin'}</button>)}
                    {loadingLang && <LoaderCircle className="w-5 h-5 animate-spin" />}
                </div>
            </div>

            <h2 className="text-center text-2xl md:text-3xl font-bold mb-4 md:mb-5">{username}</h2>

            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                <div className="order-1 lg:order-3 relative rounded border border-white/70 bg-black/40 flex items-center justify-center overflow-hidden min-h-[12rem]">
                    {cur.image ? <ZoomImage src={cur.image} className="max-h-[16rem] md:max-h-[32rem] w-full object-contain cursor-zoom-in" /> : <span className="text-white/30 text-sm">Rasm yo‘q</span>}
                    <span className={cx('absolute top-3 right-4 text-lg md:text-2xl font-medium tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]', timerUrgent ? 'text-red-500 animate-pulse' : 'text-white')}>{fmt(secondsLeft)}</span>
                </div>

                <div className={cx('order-2 lg:order-1 lg:col-span-2 relative rounded border border-white/70 bg-[#3a3f44] px-4 md:px-6 py-4 md:py-5 text-lg md:text-3xl font-semibold', cur.instruction && done && 'pr-14 md:pr-16')}>
                    {idx + 1}. {cur.question}
                    {cur.instruction && done && (
                        <div className="absolute right-3 top-3" ref={tipsRef}>
                            <button type="button" onClick={() => setTips(t => !t)} className="h-10 w-10 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center shadow"><Lightbulb className="w-5 h-5" /></button>
                            {tips && <div className="absolute right-0 top-12 z-30 w-[28rem] max-w-[calc(100vw-3rem)] rounded-xl bg-white text-gray-800 p-5 text-base font-normal shadow-2xl whitespace-pre-line">{cur.instruction}</div>}
                        </div>
                    )}
                </div>

                <div className="order-3 lg:order-2 space-y-3 md:space-y-4">
                    {cur.answers.map((a, i) => (
                        <button key={a.id} type="button" onClick={() => pick(a)} disabled={done || finished || answer.isPending || waiting}
                            className={cx('w-full flex rounded overflow-hidden border-2 bg-[#3a3f44] text-left text-base md:text-xl transition-colors', answerClass(a))}>
                            <span className="w-14 md:w-20 shrink-0 bg-[#6fa8dc] text-white font-bold flex items-center justify-center">F{i + 1}</span>
                            <span className="px-4 md:px-6 py-3 md:py-4">{a.text}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-1.5 justify-center lg:justify-end">
                {q.questions.map((x, i) => <button key={x.id} type="button" onClick={() => setIdx(i)} className={numClass(x)}>{i + 1}</button>)}
            </div>

            {confirm && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => !answer.isPending && setConfirm(null)} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl animate-pop overflow-hidden">
                        {/* Sarlavha + qizil X */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3">
                            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Tanlangan javob</p>
                            <button type="button" onClick={() => setConfirm(null)} disabled={answer.isPending} aria-label="Yopish" className="h-9 w-9 rounded-xl bg-brand-red hover:bg-brand-red-dark disabled:opacity-60 text-white flex items-center justify-center shadow-sm"><X className="w-5 h-5" strokeWidth={2.5} /></button>
                        </div>
                        {/* Variant matni: to'liq kenglikda kulrang fon, bo'sh joy minimal */}
                        <div className="bg-gray-200 px-4 py-4 border-y border-gray-300">
                            <p className="text-lg md:text-xl font-semibold leading-snug text-gray-900">{confirm.text}</p>
                        </div>
                        {/* Tugmalar: ikki qator, to'liq kenglik */}
                        <div className="p-4 space-y-3">
                            <button type="button" onClick={() => setConfirm(null)} disabled={answer.isPending} className="w-full rounded-xl bg-brand-red hover:bg-brand-red-dark disabled:opacity-60 py-3.5 text-lg font-bold text-white">Bekor qilish</button>
                            <button type="button" onClick={() => answer.mutate(confirm.id)} disabled={answer.isPending} className="w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 py-3.5 text-lg font-bold text-white flex items-center justify-center gap-2">
                                {answer.isPending && <LoaderCircle className="w-5 h-5 animate-spin" />} Tasdiqlaysizmi?
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 md:p-8 text-center text-gray-900 shadow-2xl animate-pop">
                        <h3 className="text-2xl font-extrabold">{q.is_passed ? 'Siz testdan o‘tdingiz' : 'Siz testdan o‘ta olmadingiz'}</h3>
                        {!q.is_passed && secondsLeft === 0 && <p className="mt-1 text-sm text-gray-500">Vaqt tugadi</p>}
                        <div className="mt-6"><ResultRing correct={q.correct} total={q.all_questions} passed={q.is_passed} /></div>
                        <p className="mt-4 text-sm font-semibold text-red-600">Xato: {q.in_correct}</p>
                        <p className="mt-1 text-xs text-gray-400">Natija saqlandi</p>
                        {q.is_passed
                            ? <button type="button" onClick={() => setModal(false)} className="mt-6 w-full rounded-xl bg-[#1f4e79] py-3 font-bold text-white">Davom etish</button>
                            : <button type="button" onClick={() => setModal(false)} className="mt-6 w-full rounded-xl bg-brand-red hover:bg-brand-red-dark py-3 font-bold text-white flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5" /> Qayta urinish</button>}
                    </div>
                </div>
            )}
        </div>
    );
}

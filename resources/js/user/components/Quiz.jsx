import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookmarkCheck, Lightbulb, LoaderCircle, RotateCcw } from 'lucide-react';
import api from '../api';
import { useLang } from '../lib';

const cx = (...a) => a.filter(Boolean).join(' ');
const FINISHED = 1;

export default function Quiz({ data, onRestart, restarting }) {
    const [q, setQ] = useState(data);
    const [idx, setIdx] = useState(() => Math.max(0, data.questions.findIndex(x => x.status === 0)));
    const [picked, setPicked] = useState(null);
    const [tips, setTips] = useState(false);
    const [modal, setModal] = useState(false);
    const [options, setOptions] = useState(data.homework_options ?? []); // vazifa sifatida saqlash mumkin bo'lgan homeworklar
    const [saved, setSaved] = useState(null);
    const qc = useQueryClient();
    const tipsRef = useRef(null);
    const username = document.getElementById('app').dataset.user;
    const { langs, key, set: setLang } = useLang();
    const [texts, setTexts] = useState(() => ({ [data.lang]: Object.fromEntries(data.questions.map(x => [x.id, x])) }));
    const [loadingLang, setLoadingLang] = useState(false);

    useEffect(() => { setQ(data); setTexts({ [data.lang]: Object.fromEntries(data.questions.map(x => [x.id, x])) }); setIdx(Math.max(0, data.questions.findIndex(x => x.status === 0))); setPicked(null); setModal(false); setOptions(data.homework_options ?? []); setSaved(null); }, [data]);
    useEffect(() => {
        if (texts[key] || loadingLang) return;
        setLoadingLang(true);
        api.get(`/results/${data.id}/texts`, { params: { lang: key } }).then(r => setTexts(t => ({ ...t, [key]: Object.fromEntries(r.data.map(x => [x.id, x])) }))).finally(() => setLoadingLang(false));
    }, [key, texts, data.id, loadingLang]);
    useEffect(() => {
        if (q.status === FINISHED) return;
        const h = e => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [q.status]);
    useEffect(() => { setPicked(null); setTips(false); }, [idx]);
    useEffect(() => {
        if (!tips) return;
        const h = e => !tipsRef.current?.contains(e.target) && setTips(false);
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [tips]);

    const base = q.questions[idx];
    const tx = texts[key]?.[base.id] ?? texts[data.lang]?.[base.id] ?? base;
    const cur = { ...base, question: tx.question, instruction: tx.instruction, answers: base.answers.map(a => ({ ...a, text: tx.answers.find(x => x.id === a.id)?.text ?? a.text })) };
    const done = cur.status !== 0;
    const finished = q.status === FINISHED;

    const answer = useMutation({
        mutationFn: answerId => api.post(`/results/${q.id}/answer`, { question_id: cur.id, answer_id: answerId }).then(r => r.data),
        onSuccess: (res, answerId) => {
            const questions = q.questions.map(x => x.id === cur.id ? { ...x, status: res.is_correct ? 1 : 2, user_answer_id: answerId, correct_answer_id: res.correct_answer_id } : x);
            setQ({ ...q, ...res.result, questions });
            if (res.result.status === FINISHED) { setOptions(res.homework_options ?? []); setModal(true); return; }
            const next = questions.findIndex((x, i) => i > idx && x.status === 0);
            setIdx(next !== -1 ? next : questions.findIndex(x => x.status === 0));
        },
    });

    const attach = useMutation({
        mutationFn: homeworkId => api.post(`/results/${q.id}/homework`, { homework_id: homeworkId }).then(r => r.data),
        onSuccess: res => { setSaved(res.homework); setOptions([]); qc.invalidateQueries({ queryKey: ['homeworks'] }); },
    });
    const attachError = attach.error?.response?.data?.message;

    const pick = id => {
        if (done || answer.isPending) return;
        picked === id ? answer.mutate(id) : setPicked(id);
    };

    const answerClass = a => {
        if (!done) return picked === a.id ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-transparent hover:bg-[#4a4f55]';
        if (a.id === cur.correct_answer_id) return 'border-transparent !bg-green-600';
        if (a.id === cur.user_answer_id) return 'border-transparent !bg-red-600';
        return 'border-transparent opacity-70';
    };

    const numClass = x => cx('h-9 w-9 rounded border text-sm font-semibold', x.id === cur.id ? 'ring-2 ring-white' : '', x.status === 1 ? 'bg-green-600 border-green-500' : x.status === 2 ? 'bg-red-600 border-red-500' : 'bg-white/10 border-white/40 hover:bg-white/20');

    return (
        <div className="flex-1 px-4 md:px-16 py-6 md:py-8">
            {finished && <button type="button" onClick={onRestart} disabled={restarting} className="mb-3 rounded bg-white/15 border border-white/40 px-4 py-2 text-base md:text-lg font-medium flex items-center gap-2">{restarting ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />} Qayta boshlash</button>}
            <div className="flex items-center gap-3 mb-5 md:mb-6">
                {langs.map(l => <button key={l.key} type="button" onClick={() => setLang(l.key)} disabled={loadingLang} className={cx('rounded border border-white/40 px-4 md:px-5 py-2 text-base md:text-lg', key === l.key ? 'bg-[#1e3a8a]' : 'bg-gray-500/80')}>{l.key === 'krill' ? 'Кирил' : 'Lotin'}</button>)}
                {loadingLang && <LoaderCircle className="w-5 h-5 animate-spin" />}
            </div>

            <h2 className="text-center text-2xl md:text-3xl font-bold mb-4 md:mb-5">{username}</h2>

            <div className={cx('grid gap-4 md:gap-6', cur.image ? 'lg:grid-cols-2' : 'grid-cols-1')}>
            {cur.image && (
                <div className="order-1 lg:order-3 rounded border border-white/70 bg-black/40 flex items-center justify-center overflow-hidden">
                    <img src={cur.image} alt="" className="max-h-[16rem] md:max-h-[32rem] w-full object-contain" />
                </div>
            )}
            <div className={cx('order-2 lg:order-1 lg:col-span-2 relative rounded border border-white/70 bg-[#3a3f44] px-4 md:px-6 py-4 md:py-5 text-lg md:text-3xl font-semibold', cur.instruction && 'pr-14 md:pr-16')}>
                {idx + 1}. {cur.question}
                {cur.instruction && (
                    <div className="absolute right-3 top-3" ref={tipsRef}>
                        <button type="button" onClick={() => setTips(t => !t)} className="h-10 w-10 rounded-full bg-amber-400 text-gray-900 flex items-center justify-center shadow"><Lightbulb className="w-5 h-5" /></button>
                        {tips && <div className="absolute right-0 top-12 z-30 w-[28rem] max-w-[calc(100vw-3rem)] rounded-xl bg-white text-gray-800 p-5 text-base font-normal shadow-2xl whitespace-pre-line">{cur.instruction}</div>}
                    </div>
                )}
            </div>

                <div className="order-3 lg:order-2 space-y-3 md:space-y-4">
                    {cur.answers.map((a, i) => (
                        <button key={a.id} type="button" onClick={() => pick(a.id)} disabled={done || answer.isPending}
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

            {modal && (() => {
                const answered = q.correct + q.in_correct;
                const percent = answered ? Math.round(q.correct * 100 / answered) : 0;
                const hw = options[0];
                const passing = hw ? percent >= hw.passing_percentage : null;
                const locked = options.length > 0; // vazifa bor: faqat tugmalar orqali yopiladi
                const proceed = () => {
                    setModal(false);
                    // vazifa bo'lib turib biriktirmasdan davom etilsa — natija hisobga olinmaydi, test qaytadan boshlanadi
                    if (locked && !saved) onRestart();
                };
                return (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60" onClick={locked ? undefined : () => setModal(false)} />
                        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 md:p-8 text-center text-gray-900 shadow-2xl">
                            <h3 className="text-2xl font-extrabold">{q.is_passed ? 'Siz testdan o‘tdingiz' : 'Siz testdan o‘ta olmadingiz'}</h3>
                            {hw && <p className={cx('mt-4 text-5xl font-extrabold', passing ? 'text-green-600' : 'text-red-600')}>{percent}%</p>}
                            <div className="mt-5 grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-green-50 py-5"><p className="text-4xl font-extrabold text-green-600">{q.correct}</p><p className="text-sm text-green-700 mt-1">To‘g‘ri</p></div>
                                <div className="rounded-xl bg-red-50 py-5"><p className="text-4xl font-extrabold text-red-600">{q.in_correct}</p><p className="text-sm text-red-700 mt-1">Noto‘g‘ri</p></div>
                            </div>
                            {hw && !passing && <p className="mt-3 text-xs font-medium text-red-600">Siz me‘yordan ko‘p xato qildingiz (minimum {hw.passing_percentage}%)</p>}
                            {saved && <p className="mt-3 text-sm font-semibold text-green-700 flex items-center justify-center gap-1.5"><BookmarkCheck className="w-4 h-4" /> Vazifaga saqlandi · {saved.percentage}% · {saved.tests_count} ta test</p>}
                            {!hw && !saved && <p className="mt-4 text-sm text-gray-500">Avto saqlandi</p>}
                            {attachError && <p className="mt-3 text-xs text-red-600">{attachError}</p>}
                            <div className="mt-6 space-y-2">
                                {options.map(o => (
                                    <button key={o.homework_id} type="button" disabled={attach.isPending} onClick={() => attach.mutate(o.homework_id)}
                                        className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 py-3 font-bold text-gray-900 flex items-center justify-center gap-2">
                                        {attach.isPending ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <BookmarkCheck className="w-5 h-5" />}
                                        Vazifa sifatida saqlash{options.length > 1 ? `: ${o.title}` : ''}
                                    </button>
                                ))}
                                <button type="button" onClick={proceed} disabled={attach.isPending || restarting} className="w-full rounded-xl bg-[#1f4e79] disabled:opacity-60 py-3 font-bold text-white flex items-center justify-center gap-2">{restarting && <LoaderCircle className="w-5 h-5 animate-spin" />} Davom etish</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

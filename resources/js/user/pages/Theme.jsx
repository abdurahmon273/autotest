import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import api from '../api';
import Quiz from '../components/Quiz';
import HomeworkBanner from '../components/HomeworkBanner';
import { useLang } from '../lib';

export default function Theme() {
    const { id } = useParams();
    const [quiz, setQuiz] = useState(null);
    const { key } = useLang();
    const { data } = useQuery({ queryKey: ['theme', id, key], queryFn: () => api.get(`/themes/${id}`, { params: { lang: key } }).then(r => r.data) });
    const start = useMutation({ mutationFn: () => api.post(`/themes/${id}/start`, null, { params: { lang: key } }).then(r => r.data), onSuccess: setQuiz });

    useEffect(() => setQuiz(null), [id]);

    if (quiz) return <Quiz data={quiz} onRestart={() => { setQuiz(null); start.mutate(); }} restarting={start.isPending} />;

    return (
        <>
        <HomeworkBanner themeId={id} />
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl bg-white overflow-hidden text-gray-900 shadow-2xl">
                <div className="bg-gradient-to-r from-[#0f2a5c] to-[#3b5bdb] px-8 py-10 text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Bo‘lim testi</p>
                    {data ? <h1 className="mt-2 text-3xl font-extrabold leading-tight flex items-center gap-3">
                        {data.theme.icon_type === 0 && data.theme.icon && <span>{data.theme.icon}</span>}{data.theme.title}
                    </h1> : <div className="mt-3 h-9 w-2/3 rounded bg-white/30 animate-pulse" />}
                </div>
                <div className="p-8">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Savollar soni</span>
                        {data ? <span className="text-lg font-bold text-gray-900">{data.questions_count}</span> : <span className="h-5 w-8 rounded bg-gray-200 animate-pulse" />}
                    </div>
                    <button type="button" disabled={!data || start.isPending || !data?.questions_count} onClick={() => start.mutate()}
                        className="mt-6 w-full h-14 rounded-xl bg-[#0f2a5c] hover:bg-[#1e3a8a] text-lg font-bold text-white flex items-center justify-center transition-colors disabled:opacity-60">
                        {start.isPending ? <LoaderCircle className="w-7 h-7 animate-spin" /> : 'Boshlash'}
                    </button>
                </div>
            </div>
        </div>
        </>
    );
}

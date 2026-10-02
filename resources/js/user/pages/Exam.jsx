import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import api from '../api';
import ExamQuiz from '../components/ExamQuiz';
import { useLang } from '../lib';

const TYPES = { twenty: '20 talik', fifty: '50 talik' };

export default function Exam() {
    const { type } = useParams();
    const nav = useNavigate();
    const { key, ready } = useLang();
    const [quiz, setQuiz] = useState(null);
    const [error, setError] = useState(null);
    const allowed = useRef(sessionStorage.getItem('exam_start') === type);

    useEffect(() => {
        if (!TYPES[type] || !allowed.current) { nav('/app', { replace: true }); return; }
        if (!ready) return;
        sessionStorage.removeItem('exam_start');
        let alive = true;
        api.post(`/quiz/${type}/start`, null, { params: { lang: key } })
            .then(r => alive && setQuiz(r.data))
            .catch(e => alive && setError(e.response?.data?.message ?? 'Imtihonni boshlab bo‘lmadi.'));
        return () => { alive = false; };
    }, [type, ready]);

    if (quiz) return <ExamQuiz data={quiz} onRetry={() => nav('/app')} />;

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
                {error ? (
                    <>
                        <p className="text-xl font-semibold text-red-300">{error}</p>
                        <button type="button" onClick={() => nav('/app')} className="mt-6 rounded-xl bg-white/15 border border-white/40 px-6 py-3 font-semibold">Orqaga</button>
                    </>
                ) : (
                    <>
                        <LoaderCircle className="w-12 h-12 animate-spin mx-auto" />
                        <p className="mt-4 text-lg font-semibold text-white/80">{TYPES[type]} imtihon tayyorlanmoqda...</p>
                    </>
                )}
            </div>
        </div>
    );
}

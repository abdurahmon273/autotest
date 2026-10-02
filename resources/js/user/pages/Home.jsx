import { useNavigate } from 'react-router-dom';
import HomeworkBanner from '../components/HomeworkBanner';

export default function Home() {
    const nav = useNavigate();

    return (
        <>
        <HomeworkBanner />
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-gray-900 shadow-2xl">
                <h1 className="text-3xl font-extrabold text-center">Tezkor Imtihon</h1>
                <div className="mt-8 grid grid-cols-2 gap-4">
                    {[[20, '20 talik', 'twenty'], [50, '50 talik', 'fifty']].map(([n, label, slug]) => (
                        <button key={n} type="button" onClick={() => { sessionStorage.setItem('exam_start', slug); nav(`/app/exam/${slug}`); }} className="group rounded-2xl border-2 border-gray-200 hover:border-[#3b5bdb] hover:bg-blue-50 p-6 text-center transition-colors">
                            <p className="text-5xl font-extrabold text-[#0f2a5c] group-hover:text-[#3b5bdb]">{n}</p>
                            <p className="mt-2 text-sm font-semibold text-gray-500">{label}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        </>
    );
}

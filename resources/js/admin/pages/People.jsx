import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useDebounce, useDelete, useItem, useList } from '../lib/hooks';
import { Actions, Avatar, BackLink, GroupChips, PageHeader, SearchInput, Table, Td, Th } from '../components/ui';
import { fmtDate, fmtPhone } from '../lib/utils';
import PersonModal from '../components/PersonModal';

export const KINDS = {
    teachers: { key: 'teacher', title: 'Ustoz', plural: 'Ustozlar' },
    students: { key: 'student', title: 'Student', plural: 'Studentlar' },
};

export function PeopleIndex({ kind }) {
    const k = KINDS[kind];
    const { can } = useAuth();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);
    const q = useDebounce(search);
    const { data, isFetching } = useList(`/${kind}`, { search: q, page });
    const del = useDelete(`/${kind}`);
    const cols = kind === 'students' ? 7 : 6;

    return (
        <>
            <PageHeader title={k.plural}>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Ism, telefon, username, Telegram ID..." />
                {can(`create_${k.key}`) && <button type="button" onClick={() => setModal({})} className="btn-primary"><Plus className="w-4 h-4" /> Qo‘shish</button>}
            </PageHeader>
            <Table cols={cols} loading={isFetching && !data} rows={data?.data} meta={data} onPage={setPage}
                head={<><Th>To‘liq ism</Th><Th>Username</Th><Th>Telefon</Th><Th>Telegram ID</Th>{kind === 'students' && <Th>Guruh</Th>}<Th>Yaratilgan sana</Th><Th className="text-right">Amallar</Th></>}
                render={p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                        <Td><div className="flex items-center gap-3"><Avatar name={p.name} /><span className="font-medium text-gray-900">{p.name}</span></div></Td>
                        <Td className="text-gray-700">{p.username ?? '—'}</Td>
                        <Td>{p.phone ? fmtPhone(p.phone) : '—'}</Td>
                        <Td className="text-gray-500">{p.chat_id ?? '—'}</Td>
                        {kind === 'students' && <Td><GroupChips groups={p.groups} /></Td>}
                        <Td className="text-gray-500">{fmtDate(p.created_at)}</Td>
                        <Td><Actions show={can(`show_${k.key}`) && `/admin/${kind}/${p.id}`} onEdit={can(`update_${k.key}`) && (() => setModal({ id: p.id }))} onDelete={can(`delete_${k.key}`) && (() => del(`/${kind}/${p.id}`, `${p.name} o‘chirilsinmi?`))} /></Td>
                    </tr>
                )} />
            {modal && <PersonModal kind={kind} id={modal.id} title={modal.id ? `${k.title}ni tahrirlash` : `${k.title} qo‘shish`} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
        </>
    );
}

export function PersonShow({ kind }) {
    const k = KINDS[kind];
    const { id } = useParams();
    const { can } = useAuth();
    const [edit, setEdit] = useState(false);
    const { data: p } = useItem(`/${kind}/${id}`);
    if (!p) return null;

    return (
        <>
            <PageHeader title={p.name}>
                <BackLink to={`/admin/${kind}`} />
                {can(`update_${k.key}`) && <button type="button" onClick={() => setEdit(true)} className="btn-primary">Tahrirlash</button>}
            </PageHeader>
            {edit && <PersonModal kind={kind} id={p.id} title={`${k.title}ni tahrirlash`} onClose={() => setEdit(false)} onSaved={() => setEdit(false)} />}
            <div className="card p-6 max-w-lg">
                <div className="flex items-center gap-4 mb-6"><Avatar name={p.name} size="w-14 h-14 text-xl" /><div><p className="font-semibold text-gray-900">{p.name}</p><p className="text-sm text-gray-500">{k.title}</p></div></div>
                <dl className="space-y-3 text-sm">
                    {[['ID', p.id], ['Telefon', p.phone_formatted ?? '—'], ['Username', p.username ?? '—'], ['Telegram ID', p.chat_id ?? '—'], ["Jarima imkoniyatlar soni", p.max_attempts], ['Yaratilgan', fmtDate(p.created_at)], ['Yangilangan', fmtDate(p.updated_at)]].map(([l, v]) => (
                        <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                </dl>
            </div>
        </>
    );
}

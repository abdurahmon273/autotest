import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import api, { errorsOf } from '../api';
import { useAuth } from '../lib/auth';
import { Field, Input } from '../components/ui';

export default function Login() {
    const { user, loading, setMe } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({ email: '', password: '', remember: false });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    if (!loading && user) return <Navigate to="/admin" replace />;

    const submit = async e => {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await api.post('/login', form);
            setMe(data);
            nav('/admin', { replace: true });
        } catch (err) {
            setErrors(errorsOf(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-gray-100 flex items-center justify-center min-h-screen">
            <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h2>
                <Field label="Email" error={errors.email} className="mb-4">
                    <Input type="email" autoFocus value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" />
                </Field>
                <Field label="Password" error={errors.password} className="mb-4">
                    <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                </Field>
                <label className="mb-6 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input type="checkbox" checked={form.remember} onChange={e => setForm({ ...form, remember: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-admin-primary focus:ring-admin-primary" />
                    Eslab qolish
                </label>
                <button type="submit" disabled={busy} className="w-full bg-admin-primary text-white py-2 px-4 rounded-md hover:bg-admin-primary-hover flex items-center justify-center gap-2 transition-colors">
                    {busy && <LoaderCircle className="w-4 h-4 animate-spin" />} Login
                </button>
            </form>
        </div>
    );
}

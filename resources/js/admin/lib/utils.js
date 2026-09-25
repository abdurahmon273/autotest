export const cx = (...a) => a.filter(Boolean).join(' ');

export const fmtDate = d => {
    if (!d) return '—';
    const x = new Date(d);
    const p = n => String(n).padStart(2, '0');
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`;
};

export const fmtPhone = p => (p && p.length === 9 ? `(${p.slice(0, 2)}) ${p.slice(2, 5)}-${p.slice(5, 7)}-${p.slice(7)}` : p || '—');

export const initials = name => (name || '?').trim().charAt(0).toUpperCase();

export const PERMISSION_TYPES = { 1: 'Admin', 2: 'Teacher', 3: 'Student', 4: 'Hammasi' };
export const QUESTION_TYPES = { 0: 'Rasmsiz', 1: 'Rasmli' };
export const ROLE_ADMIN = 1;
export const SYSTEM_ROLES = [1, 2, 3];

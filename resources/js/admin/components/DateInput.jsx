import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { CalendarDays } from 'lucide-react';
import { cx } from '../lib/utils';

const UZ = {
    weekdays: { shorthand: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'], longhand: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'] },
    months: { shorthand: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'], longhand: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'] },
    firstDayOfWeek: 1,
};

/** Faqat sana (Y-m-d). value / onChange string. */
export default function DateInput({ value, onChange, minDate, maxDate, placeholder = 'Sana', className }) {
    const input = useRef(null);
    const fp = useRef(null);
    const cb = useRef(onChange);
    cb.current = onChange;

    useEffect(() => {
        fp.current = flatpickr(input.current, { dateFormat: 'Y-m-d', allowInput: true, locale: UZ, disableMobile: true, onChange: (_, str) => cb.current(str) });
        return () => fp.current?.destroy();
    }, []);
    useEffect(() => { if (fp.current && (fp.current.input.value || '') !== (value || '')) fp.current.setDate(value || null, false); }, [value]);
    useEffect(() => { fp.current?.set('minDate', minDate || null); }, [minDate]);
    useEffect(() => { fp.current?.set('maxDate', maxDate || null); }, [maxDate]);

    return (
        <div className={cx('relative', className)}>
            <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={input} defaultValue={value} placeholder={placeholder} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); fp.current?.setDate(e.target.value, true, 'Y-m-d'); fp.current?.close(); } }} className="form-input pl-9" />
        </div>
    );
}

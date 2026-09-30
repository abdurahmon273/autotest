import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { CalendarClock, X } from 'lucide-react';
import { cx } from '../lib/utils';

const UZ = {
    weekdays: { shorthand: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'], longhand: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'] },
    months: { shorthand: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'], longhand: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'] },
    firstDayOfWeek: 1,
    rangeSeparator: ' — ',
    time_24hr: true,
};

/** value / onChange: 'Y-m-d H:i' formatidagi string yoki ''. */
export default function DateTimePicker({ value, onChange, minDate, placeholder = 'Sana va vaqt', className }) {
    const input = useRef(null);
    const fp = useRef(null);
    const cb = useRef(onChange);
    cb.current = onChange;

    useEffect(() => {
        fp.current = flatpickr(input.current, {
            enableTime: true,
            time_24hr: true,
            minuteIncrement: 1,
            dateFormat: 'Y-m-d H:i',
            allowInput: true,
            locale: UZ,
            disableMobile: true,
            onChange: (_, str) => cb.current(str),
        });
        return () => fp.current?.destroy();
    }, []);

    useEffect(() => {
        const cur = fp.current;
        if (!cur) return;
        if ((cur.input.value || '') !== (value || '')) cur.setDate(value || null, false);
    }, [value]);

    useEffect(() => { fp.current?.set('minDate', minDate || null); }, [minDate]);

    return (
        <div className={cx('relative', className)}>
            <CalendarClock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input ref={input} defaultValue={value} placeholder={placeholder} className="form-input pl-9 pr-9" />
            {value && <button type="button" onClick={() => { fp.current?.clear(); onChange(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>}
        </div>
    );
}

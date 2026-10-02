import { useEffect, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { CalendarDays, Clock, X } from 'lucide-react';
import { cx } from '../lib/utils';

const UZ = {
    weekdays: { shorthand: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'], longhand: ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'] },
    months: { shorthand: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'], longhand: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'] },
    firstDayOfWeek: 1,
    rangeSeparator: ' — ',
};

const DEFAULT_TIME = '09:00';
const split = v => { const m = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?$/.exec(v || ''); return m ? [m[1], m[2] ?? ''] : ['', '']; };

/** Raqamlardan HH:MM yasash: "9" -> "09:", "930" -> "09:30", soat 0–23, minut 0–59 ga cheklanadi. */
function maskTime(raw) {
    let d = raw.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 1 && Number(d[0]) > 2) d = '0' + d; // 9 -> 09
    if (d.length >= 2 && Number(d.slice(0, 2)) > 23) d = '23' + d.slice(2);
    if (d.length >= 3 && Number(d[2]) > 5) d = d.slice(0, 2) + '5' + d.slice(3);
    d = d.slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d.length === 2 ? d + ':' : d;
}

/** value / onChange: 'Y-m-d H:i' yoki ''. Sana — kalendar, vaqt — oddiy HH:MM input, yozilishi bilan ta'sir qiladi. */
export default function DateTimePicker({ value, onChange, minDate, placeholder = 'Sana', className }) {
    // Sana va vaqt alohida lokal holatda: biri chala bo'lsa ham ikkinchisi yo'qolmaydi.
    const [[date, timeText], setParts] = useState(() => split(value));
    const dateInput = useRef(null);
    const timeInput = useRef(null);
    const fp = useRef(null);
    const cb = useRef(null);
    cb.current = { onChange, date, timeText };

    const setTimeText = t => setParts(([d]) => [d, t]);
    const emit = (d, t) => cb.current.onChange(d && /^\d{2}:\d{2}$/.test(t) ? `${d} ${t}` : '');

    useEffect(() => {
        fp.current = flatpickr(dateInput.current, {
            dateFormat: 'Y-m-d',
            allowInput: true,
            locale: UZ,
            disableMobile: true,
            onChange: (_, str) => {
                let t = cb.current.timeText;
                const hadTime = /^\d{2}:\d{2}$/.test(t);
                if (!hadTime) t = str ? DEFAULT_TIME : '';
                setParts([str, t]);
                emit(str, t);
                if (str && !hadTime) setTimeout(() => timeInput.current?.select(), 0);
            },
        });
        return () => fp.current?.destroy();
    }, []);

    // Tashqaridan to'liq qiymat kelsa (edit formasi yuklanganda) lokal holatni moslash
    useEffect(() => {
        if (!value) return;
        const [d, t] = split(value);
        if (d !== date || t !== timeText) setParts([d, t]);
        if (fp.current && (fp.current.input.value || '') !== d) fp.current.setDate(d, false);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fp.current?.set('minDate', minDate ? split(minDate)[0] || minDate : null); }, [minDate]);

    const onTime = e => {
        const t = maskTime(e.target.value);
        setTimeText(t);
        if (/^\d{2}:\d{2}$/.test(t)) emit(date, t);
        else if (value) cb.current.onChange(''); // to'liq bo'lmagan vaqt — qiymat yo'q
    };
    const onTimeBlur = () => {
        // "09:" yoki "09:3" kabi chala qolsa to'ldirib qo'yish
        const d = timeText.replace(/\D/g, '');
        if (d.length === 0) return;
        const t = (d + '0000').slice(0, 2) + ':' + (d + '0000').slice(2, 4);
        setTimeText(t);
        emit(date, t);
    };
    const clear = () => { fp.current?.clear(); setParts(['', '']); onChange(''); };
    // Enter forma yubormasin: sanada — yozilganini qabul qilib vaqtga o'tadi, vaqtda — faqat to'ldiradi
    const onDateKey = e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        fp.current?.setDate(e.target.value, true, 'Y-m-d');
        fp.current?.close();
        setTimeout(() => timeInput.current?.select(), 0);
    };
    const onTimeKey = e => { if (e.key === 'Enter') { e.preventDefault(); onTimeBlur(); e.target.blur(); } };

    return (
        <div className={cx('flex gap-2', className)}>
            <div className="relative flex-1">
                <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={dateInput} defaultValue={date} placeholder={placeholder} onKeyDown={onDateKey} className="form-input pl-9" />
            </div>
            <div className="relative w-28 shrink-0">
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={timeInput} value={timeText} onChange={onTime} onBlur={onTimeBlur} onKeyDown={onTimeKey} placeholder="HH:MM" inputMode="numeric" maxLength={5} className="form-input pl-9 pr-2 tabular-nums" />
            </div>
            {(date || timeText) && <button type="button" onClick={clear} className="icon-btn text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0 self-center" title="Tozalash"><X className="w-4 h-4" /></button>}
        </div>
    );
}

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ModernDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function ModernDatePicker({ value, onChange, placeholder = 'Pilih tanggal...' }: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formatDisplayDate = (valStr: string) => {
    if (!valStr) return '';
    const [y, m, d] = valStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    return `${d < 10 ? '0' + d : d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  const handleSelectDate = (d: number) => {
    const monthFormatted = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    const dayFormatted = d < 10 ? `0${d}` : `${d}`;
    onChange(`${year}-${monthFormatted}-${dayFormatted}`);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1 < 10 ? `0${today.getMonth() + 1}` : `${today.getMonth() + 1}`;
    const d = today.getDate() < 10 ? `0${today.getDate()}` : `${today.getDate()}`;
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = yesterday.getMonth() + 1 < 10 ? `0${yesterday.getMonth() + 1}` : `${yesterday.getMonth() + 1}`;
    const d = yesterday.getDate() < 10 ? `0${yesterday.getDate()}` : `${yesterday.getDate()}`;
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const isToday = (d: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === d;
  };

  const isSelected = (d: number) => {
    const dayFormatted = d < 10 ? `0${d}` : `${d}`;
    const monthFormatted = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    return value === `${year}-${monthFormatted}-${dayFormatted}`;
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="relative">
      <button
        id="eventDateSelector"
        type="button"
        aria-label="Pilih tanggal kejadian"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border text-left flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'border-emerald-600 ring-4 ring-emerald-600/15 bg-white'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100/70'
        } ${value ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}
      >
        <span className="text-xs sm:text-sm truncate">{value ? formatDisplayDate(value) : placeholder}</span>
        <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-30 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15">
            {/* Header Bulan */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-slate-800">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Hari */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES.map((d, idx) => (
                <span
                  key={d}
                  className={`text-[10px] uppercase py-1 ${
                    idx === 0 ? 'font-black text-rose-600' : 'font-extrabold text-slate-500'
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {cells.map((d, i) => {
                if (d === null) {
                  return <span key={`empty-${i}`} />;
                }
                const isSunday = i % 7 === 0;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDate(d)}
                    className={`h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isSelected(d)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isToday(d)
                          ? isSunday
                            ? 'bg-rose-50 text-rose-700 border border-rose-300 font-black'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : isSunday
                            ? 'text-rose-600 hover:bg-rose-50 font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Aksi Cepat */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetToday}
                className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-extrabold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="flex-1 px-2 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-extrabold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Kemarin
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Hapus tanggal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
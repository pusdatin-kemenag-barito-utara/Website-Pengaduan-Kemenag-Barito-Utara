import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ModernDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

type ViewMode = 'days' | 'months' | 'years';

export default function ModernDatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
}: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
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

  // Decade calculation for 12-year grid
  const decadeStart = Math.floor(year / 12) * 12;
  const decadeYears = Array.from({ length: 12 }, (_, i) => decadeStart + i);

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
    setViewMode('days');
  };

  const handleSelectMonth = (mIdx: number) => {
    setViewDate(new Date(year, mIdx, 1));
    setViewMode('days');
  };

  const handleSelectYear = (yVal: number) => {
    setViewDate(new Date(yVal, month, 1));
    setViewMode('months');
  };

  const handlePrev = () => {
    if (viewMode === 'days') {
      setViewDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'months') {
      setViewDate(new Date(year - 1, month, 1));
    } else if (viewMode === 'years') {
      setViewDate(new Date(decadeStart - 12, month, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      setViewDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'months') {
      setViewDate(new Date(year + 1, month, 1));
    } else if (viewMode === 'years') {
      setViewDate(new Date(decadeStart + 12, month, 1));
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1 < 10 ? `0${today.getMonth() + 1}` : `${today.getMonth() + 1}`;
    const d = today.getDate() < 10 ? `0${today.getDate()}` : `${today.getDate()}`;
    setViewDate(new Date(y, today.getMonth(), 1));
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
    setViewMode('days');
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = yesterday.getMonth() + 1 < 10 ? `0${yesterday.getMonth() + 1}` : `${yesterday.getMonth() + 1}`;
    const d = yesterday.getDate() < 10 ? `0${yesterday.getDate()}` : `${yesterday.getDate()}`;
    setViewDate(new Date(y, yesterday.getMonth(), 1));
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
    setViewMode('days');
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
        onClick={() => {
          if (!isOpen && value) {
            const parts = value.split('-').map(Number);
            if (parts[0] && parts[1]) {
              setViewDate(new Date(parts[0], parts[1] - 1, 1));
            }
          }
          setViewMode('days');
          setIsOpen(!isOpen);
        }}
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
          <div
            className="fixed inset-0 z-20"
            onClick={() => {
              setIsOpen(false);
              setViewMode('days');
            }}
          />
          <div className="absolute left-0 right-0 top-full mt-2 z-30 p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15 animate-in fade-in duration-200 min-w-[280px]">
            {/* Header: Navigasi & Mode Switcher */}
            <div className="flex items-center justify-between gap-1.5 mb-3">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-1.5 justify-center flex-1">
                {viewMode === 'days' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewMode('months')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-800 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>{MONTH_NAMES[month]}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('years')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-800 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>{year}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </>
                )}

                {viewMode === 'months' && (
                  <button
                    type="button"
                    onClick={() => setViewMode('years')}
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-800 text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Tahun {year}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                )}

                {viewMode === 'years' && (
                  <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-black">
                    {decadeStart} – {decadeStart + 11}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                title="Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Mode Tampilan Hari (Default) */}
            {viewMode === 'days' && (
              <>
                {/* Nama Hari */}
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

                {/* Grid Tanggal */}
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
              </>
            )}

            {/* 2. Mode Tampilan Bulan (Bento Grid 3x4) */}
            {viewMode === 'months' && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {MONTH_NAMES.map((name, idx) => {
                  const isCurrentMonth = idx === month;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrentMonth
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-100'
                      }`}
                    >
                      <span className="block sm:hidden">{MONTH_SHORT[idx]}</span>
                      <span className="hidden sm:block">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Mode Tampilan Tahun (Bento Grid 3x4 per Dekade) */}
            {viewMode === 'years' && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {decadeYears.map((yVal) => {
                  const isCurrentYear = yVal === year;
                  return (
                    <button
                      key={yVal}
                      type="button"
                      onClick={() => handleSelectYear(yVal)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrentYear
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-100'
                      }`}
                    >
                      {yVal}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Aksi Cepat & Reset */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetToday}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-extrabold hover:bg-emerald-100 transition-colors cursor-pointer text-center"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-extrabold hover:bg-slate-100 transition-colors cursor-pointer text-center"
              >
                Kemarin
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                    setViewMode('days');
                  }}
                  className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Hapus pilihan tanggal"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
import {
  AlertCircle, BarChart3, CheckCircle, Clock, FileText, RefreshCw, Star, TrendingUp,
} from 'lucide-react';
import type { AdminStats } from '../../lib/apiAdmin';
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from './types';

interface StatsViewProps {
  stats: AdminStats | null;
  onRefreshStats: () => Promise<void>;
}

export default function StatsView({ stats, onRefreshStats }: StatsViewProps) {
  const categoryColors: Record<string, string> = {
    Saran: '#059669',
    Masukan: '#0284c7',
    Pengaduan: '#dc2626',
    Keluhan: '#d97706',
    Informasi: '#7c3aed',
    Tanggapan: '#0891b2',
  };

  const statusColors: Record<string, string> = {
    Menunggu: '#d97706',
    Diproses: '#2563eb',
    Selesai: '#059669',
    Ditolak: '#dc2626',
  };

  const categoryCounts = CATEGORY_OPTIONS.map((k) => ({ label: k, count: stats?.by_category?.[k] || 0 }));
  const statusCounts = STATUS_OPTIONS.map((k) => ({ label: k, count: stats?.by_status?.[k] || 0 }));
  const maxCat = Math.max(...categoryCounts.map((c) => c.count), 1);
  const avgRating = stats?.avg_rating ?? null;
  const totalDonut = statusCounts.reduce((s, c) => s + c.count, 0) || 1;
  let donutOffset = 0;
  const maxDay = Math.max(...(stats?.last_30_days || []).map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Statistik Pengaduan</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Ringkasan analitik data pengaduan &amp; aspirasi SI-GESIT secara real-time.</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefreshStats()}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Perbarui Data
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Tiket', val: stats?.total ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <FileText className="w-5 h-5 text-emerald-600" /> },
          { label: 'Menunggu', val: statusCounts[0].count, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: <Clock className="w-5 h-5 text-amber-500" /> },
          { label: 'Diproses', val: statusCounts[1].count, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: <RefreshCw className="w-5 h-5 text-blue-600" /> },
          { label: 'Selesai', val: statusCounts[2].count, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <CheckCircle className="w-5 h-5 text-emerald-600" /> },
          { label: 'Ditolak', val: statusCounts[3].count, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', icon: <AlertCircle className="w-5 h-5 text-rose-600" /> },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] text-slate-500 font-bold">{card.label}</p>
              <p className={`text-3xl font-black mt-0.5 ${card.color}`}>{card.val}</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl ${card.bg} flex items-center justify-center`}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-black text-slate-900 text-sm">Pengaduan per Kategori</h3>
          </div>
          <div className="space-y-3">
            {categoryCounts.map(({ label, count }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>{label}</span>
                  <span>{count}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${(count / maxCat) * 100}%`, backgroundColor: categoryColors[label] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-black text-slate-900 text-sm">Distribusi Status</h3>
          </div>
          <div className="flex flex-col items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-36 h-36" style={{ transform: 'rotate(-90deg)' }}>
              {statusCounts.map(({ label, count }) => {
                const pct = (count / totalDonut) * 100;
                const dash = `${pct} ${100 - pct}`;
                const el = (
                  <circle
                    key={label}
                    cx="50"
                    cy="50"
                    r="15.915"
                    fill="none"
                    strokeWidth="10"
                    stroke={statusColors[label]}
                    strokeDasharray={dash}
                    strokeDashoffset={-donutOffset}
                  />
                );
                donutOffset += pct;
                return el;
              })}
              <circle cx="50" cy="50" r="10" fill="white" />
            </svg>
            <div className="space-y-1.5 w-full">
              {statusCounts.map(({ label, count }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: statusColors[label] }} />
                    <span className="font-semibold text-slate-700">{label}</span>
                  </div>
                  <span className="font-black text-slate-900">
                    {count} <span className="text-slate-400 font-normal">({totalDonut > 0 ? ((count / totalDonut) * 100).toFixed(0) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-black text-slate-900 text-sm">Tren 30 Hari Terakhir</h3>
          </div>
          {(stats?.last_30_days || []).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Belum ada data harian</p>
          ) : (
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {stats!.last_30_days.map((d) => (
                <div key={d.date} className="flex-1 min-w-[14px] flex flex-col items-center gap-1">
                  <span className="text-[9px] font-black text-emerald-700">{d.count}</span>
                  <div
                    className="w-full rounded-t bg-emerald-500 transition-all duration-700"
                    style={{ height: `${Math.max((d.count / maxDay) * 100, 2)}%` }}
                  />
                  <span className="text-[8px] text-slate-400 font-bold">
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-slate-900 text-sm">Penilaian Layanan</h3>
          </div>
          <div className="flex items-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-5xl font-black text-amber-500">{avgRating ?? '-'}</p>
              <p className="text-[11px] text-slate-500 font-bold mt-1">Rata-rata Rating</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${avgRating && avgRating >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-center text-[11px] text-slate-400 font-bold mt-1.5">
                Dari laporan yang telah selesai ditindaklanjuti
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

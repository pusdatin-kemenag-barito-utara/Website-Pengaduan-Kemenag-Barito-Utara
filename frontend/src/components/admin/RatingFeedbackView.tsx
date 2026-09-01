import { useEffect, useState, type FormEvent } from 'react';
import {
  Award,
  MessageSquareHeart,
  RefreshCw,
  Search,
  Star,
  User,
} from 'lucide-react';
import { adminListRatings } from '../../lib/apiAdmin';
import type { RatingItem, RatingStats } from './types';

export default function RatingFeedbackView() {
  const [list, setList] = useState<RatingItem[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [starFilter, setStarFilter] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRatings = async (targetPage = page, star = starFilter, q = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminListRatings({
        page: targetPage,
        per_page: 20,
        star: star > 0 ? star : undefined,
        search: q.trim() || undefined,
      });
      setList(res.items);
      setStats(res.stats);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ulasan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRatings(1, starFilter, search);
  }, [starFilter]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    void fetchRatings(1, starFilter, search);
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-500" />
            <span>Indeks Kepuasan Masyarakat (IKM) &amp; Ulasan</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Evaluasi penilaian mutu pelayanan dan kritik saran dari masyarakat pemohon.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRatings(page, starFilter, search)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI & Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Nilai IKM */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-500/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider">
                Skor IKM (Skala 100)
              </span>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-4xl sm:text-5xl font-black tracking-tight">{stats.ikm_score.toFixed(1)}</span>
                <span className="text-sm font-bold text-amber-100">/ 100</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
              <span className="text-xs font-medium text-amber-100">Mutu Pelayanan:</span>
              <span className="text-xs font-black bg-white/20 px-2.5 py-0.5 rounded-lg text-white">
                {stats.ikm_grade}
              </span>
            </div>
          </div>

          {/* Card 2: Rata-rata Bintang */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider">
                Rata-rata Rating
              </span>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                  {stats.avg_rating.toFixed(2)}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(stats.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1">
                    dari {stats.total_rated} responden
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-4 pt-3 border-t border-slate-100">
              Penilaian langsung dari pemohon setelah tiket selesai.
            </p>
          </div>

          {/* Card 3: Distribusi Bintang */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider self-start">
              Sebaran Penilaian
            </span>
            <div className="space-y-1.5 my-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[String(star)] || 0;
                const pct = stats.total_rated > 0 ? (count / stats.total_rated) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs font-semibold">
                    <span className="w-4 text-slate-700 text-right">{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-7 text-right text-[11px] text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium text-right">
              Total {stats.total_rated} Masukan
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Star Rating Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStarFilter(0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              starFilter === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Bintang
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStarFilter(s)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                starFilter === s
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Star className={`w-3 h-3 ${starFilter === s ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
              <span>{s}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ulasan / tiket..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </form>
      </div>

      {/* Feedback List */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Memuat data ulasan &amp; kepuasan...</p>
        </div>
      ) : (list || []).length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Belum ada ulasan masyarakat</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ulasan dan rating kepuasan akan muncul setelah pemohon memberikan penilaian pada nomor tiket yang telah diselesaikan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(list || []).map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-800">
                    #{item.ticket_number}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    {item.service_unit}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{item.full_name || 'Masyarakat (Anonim)'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-xl self-start sm:self-auto">
                  <span className="text-xs font-black text-amber-900 mr-1">{item.rating}.0</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {item.user_feedback ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed italic">
                    &ldquo;{item.user_feedback}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Pemohon memberikan rating bintang tanpa menyertakan ulasan teks.
                </p>
              )}

              <div className="text-[11px] text-slate-400 font-medium text-right">
                Dikirim pada: {new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          ))}

          {/* Pagination note */}
          <div className="text-center text-xs text-slate-500 font-medium pt-2">
            Menampilkan {list.length} dari total {total} ulasan masuk
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { adminLogin } from '../../lib/apiAdmin';
import { analytics } from '../../lib/analytics';
import { TURNSTILE_SITE_KEY } from './types';

interface AdminLoginProps {
  onLoginSuccess: (me: { email: string; role: string }) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [turnstileKey, setTurnstileKey] = useState<number>(0);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0 || isLoading) return;

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setLoginError('Harap isi email/username dan kata sandi.');
      return;
    }

    setLoginError(null);
    setIsLoading(true);
    analytics.adminLoginAttempt();

    try {
      const me = await adminLogin(cleanUsername, password);
      analytics.adminLoginSuccess(me.role);
      onLoginSuccess(me);
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      const errMsg = err instanceof Error ? err.message : 'Username atau password tidak sesuai!';
      analytics.adminLoginFailed(errMsg);
      setLoginError(errMsg);
      setTurnstileKey((prev) => prev + 1);

      if (newAttempts >= 3) {
        setCooldownSeconds(10);
        const timer = setInterval(() => {
          setCooldownSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full bg-white text-slate-900 grid grid-cols-1 lg:grid-cols-2 font-sans selection:bg-emerald-800 selection:text-white overflow-hidden">
      
      {/* ========================================================================= */}
      {/* PANEL KIRI: FULL-HEIGHT BRANDING RESMI (Khusus Layar Desktop lg)          */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-10 xl:p-14 text-white flex-col justify-between relative overflow-hidden h-full">
        {/* Subtle Ambient Light Decoration */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-inner shrink-0">
            <img src="/kemenag.svg" alt="Logo Kemenag" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
              Kementerian Agama RI
            </p>
            <p className="text-sm sm:text-base font-extrabold text-white">
              Kabupaten Barito Utara
            </p>
          </div>
        </div>

        {/* Center Title & Ringkas Info */}
        <div className="relative z-10 my-10 space-y-4 max-w-lg">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold tracking-wide inline-block">
            Portal Petugas Terverifikasi
          </span>
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
            SI-GESIT
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 font-medium leading-relaxed">
            Sistem Informasi Pengelolaan Aspirasi, Saran, dan Pengaduan Layanan Masyarakat.
          </p>
        </div>

        {/* Bottom Note */}
        <div className="relative z-10 text-xs text-emerald-200/70 font-medium">
          Kantor Kementerian Agama Kabupaten Barito Utara &bull; Muara Teweh
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL KANAN: FULL-HEIGHT FORM LOGIN KOMPAK & LEGA                          */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/60 p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between relative h-full max-h-[100dvh] overflow-y-auto">
        
        {/* Top Bar: Navigasi Kembali & Mini Logo di Mobile */}
        <div className="flex items-center justify-between shrink-0">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-emerald-700 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Beranda</span>
          </a>

          {/* Mini Badge Logo Kemenag di Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-7 h-7 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center">
              <img src="/kemenag.svg" alt="Logo Kemenag" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black tracking-wider text-emerald-800 uppercase">SI-GESIT</span>
          </div>
        </div>

        {/* Form Container (Tengah, Spacing Nyaman & Lega) */}
        <div className="my-auto py-4 sm:py-6 max-w-md w-full mx-auto space-y-5 sm:space-y-6 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] font-bold tracking-wide mb-2 lg:hidden">
              <Lock className="w-3 h-3" />
              <span>Portal Petugas Terverifikasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Masuk ke Panel Petugas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Masukkan email/username kedinasan dan kata sandi Anda.
            </p>
          </div>

          {/* Alert Error */}
          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-snug">{loginError}</span>
            </div>
          )}

          {/* Alert Cooldown Jeda Keamanan */}
          {cooldownSeconds > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Percobaan gagal. Tunggu <strong>{cooldownSeconds} detik</strong>.</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-4.5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-xs font-bold text-slate-700">
                Email / Username
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nama@kemenag.go.id"
                  maxLength={100}
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 font-semibold transition-all shadow-2xs"
                  required
                  autoComplete="username"
                  disabled={isLoading || cooldownSeconds > 0}
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-4 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  maxLength={100}
                  className="w-full pl-10 pr-11 py-3 sm:py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 font-semibold transition-all shadow-2xs"
                  required
                  autoComplete="current-password"
                  disabled={isLoading || cooldownSeconds > 0}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-4 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3 top-2.5 sm:top-3 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Bot Protection */}
            <div className="flex justify-center pt-1 overflow-hidden min-h-[65px]">
              <Turnstile
                key={turnstileKey}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={() => undefined}
                options={{ theme: 'light', size: 'flexible' }}
              />
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={isLoading || cooldownSeconds > 0}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30 flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] group"
            >
              <span>{isLoading ? 'Memverifikasi Akun...' : 'Masuk ke Panel Petugas'}</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-800/80 flex items-center justify-center group-hover:translate-x-0.5 transition-transform shrink-0">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-200" />
              </div>
            </button>
          </form>
        </div>

        {/* Bottom Micro Footer */}
        <div className="text-center text-slate-400 text-xs font-medium py-2 shrink-0">
          &copy; {new Date().getFullYear()} SI-GESIT &bull; Kemenag Barito Utara
        </div>
      </div>

    </div>
  );
}

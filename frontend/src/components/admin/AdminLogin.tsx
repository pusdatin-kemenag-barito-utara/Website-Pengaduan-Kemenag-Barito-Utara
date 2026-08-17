import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { adminLogin } from '../../lib/apiAdmin';
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

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);
    try {
      const me = await adminLogin(username.trim(), password);
      onLoginSuccess(me);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Username atau password salah!');
      setTurnstileKey((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden selection:bg-emerald-900 selection:text-white">
      {/* Background Dot Grid & Ambient Lighting */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-200/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Link */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between pt-2">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Beranda Publik</span>
        </a>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-mono font-extrabold text-slate-500 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>AUTH v2.1</span>
        </div>
      </div>

      {/* Double-Bezel Main Login Enclosure */}
      <div className="relative z-10 w-full max-w-md my-auto py-4">
        {/* Outer Machined Shell */}
        <div className="rounded-[2.5rem] p-2 bg-slate-900/[0.02] border border-slate-200/80 shadow-2xl shadow-slate-900/[0.06]">
          {/* Inner Core Hardware Card */}
          <div className="rounded-[calc(2.5rem-0.5rem)] bg-white/95 backdrop-blur-2xl border border-slate-100 p-6 sm:p-8 space-y-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
            
            {/* Header Branding */}
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-100/80 shadow-xs mx-auto">
                <img src="/kemenag.svg" alt="Logo Kemenag" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-black uppercase tracking-wider mb-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Portal Petugas Terverifikasi</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Panel TIM Pengaduan
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  SI-GESIT • Kemenag Kabupaten Barito Utara
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-snug">{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Email / Username Akun
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="baritoutara@kemenag.go.id"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-semibold transition-all"
                    required
                    autoComplete="username"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-semibold transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Turnstile Bot Protection */}
              <div className="flex justify-center pt-1 overflow-hidden">
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
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30 flex items-center justify-between gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99] group"
              >
                <span>{isLoading ? 'Memeriksa Kredensial...' : 'Masuk ke Panel Petugas'}</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-800/80 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-200" />
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Authority Micro Footer */}
      <div className="relative z-10 w-full max-w-md text-center space-y-1 pb-2">
        <p className="text-[11px] text-slate-400 font-medium">
          Hak Cipta &copy; {new Date().getFullYear()} Kantor Kementerian Agama Kabupaten Barito Utara
        </p>
        <p className="text-[10px] text-slate-400 font-mono">
          256-bit Encrypted Server-Side Session • GoTrue Auth Guard
        </p>
      </div>
    </div>
  );
}

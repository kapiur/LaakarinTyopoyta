"use client";
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Globe, LayoutDashboard, Loader2 } from 'lucide-react';
import { useI18n } from '../../lib/useI18n';
import { SUPPORTED_UI_LANGUAGES, type UiLanguage } from '../../lib/i18n';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password: password,
        redirect: false
      });

      if (res?.error) {
        setError(t('auth.invalidCredentials'));
      } else if (res?.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(t('auth.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-200/70">
                <LayoutDashboard size={32} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900">{t('auth.loginTitle')}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.loginSubtitle')}</p>
              </div>
            </div>

            <label className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <Globe size={14} />
              <span className="sr-only">{t('auth.languageLabel')}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as UiLanguage)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                aria-label={t('auth.languageLabel')}
              >
                {SUPPORTED_UI_LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.nativeName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('auth.emailLabel')}
              </label>
              <input
                id="login-email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('auth.passwordLabel')}
              </label>
              <input
                id="login-password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="text-center text-xs font-bold text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { AlertCircle, Eye, EyeOff, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    const apiToken = import.meta.env.VITE_API_TOKEN;
    if ((apiToken || isAuthenticated) && !hasRedirected.current && location.pathname === '/login') {
      hasRedirected.current = true;
      navigate('/', { replace: true });
      return;
    }
  }, [navigate, isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated && location.pathname === '/login') {
      hasRedirected.current = false;
    }
  }, [isAuthenticated, location.pathname]);

  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 animate-spin" />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il login. Verifica le credenziali.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50/30 to-surface-100 dark:from-surface-950 dark:via-primary-950/20 dark:to-surface-900 px-4 transition-colors duration-300">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/10 dark:bg-primary-400/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 dark:bg-primary-600/5 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 p-2.5 rounded-xl bg-white/60 dark:bg-surface-800/60 backdrop-blur-sm border border-surface-200/60 dark:border-surface-700/60 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-all duration-200 z-10"
      >
        {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="max-w-md w-full relative">
        <div className="bg-white/70 dark:bg-surface-900/70 backdrop-blur-xl rounded-3xl shadow-soft-lg dark:shadow-dark-soft border border-surface-200/60 dark:border-surface-800/60 p-8 sm:p-10 transition-all duration-300">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 mb-4">
              <img 
                src="/logo_capibara.png" 
                alt="Capibara" 
                className="h-10 w-10 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">
              Capibara Editor
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1.5 text-sm">
              Accedi per gestire i contenuti
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3 animate-slide-up">
              <AlertCircle className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" size={18} />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="label">
                Email o Username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input"
                required
                autoFocus
                placeholder="utente@esempio.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  required
                  placeholder="La tua password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Accesso in corso...</span>
                </div>
              ) : (
                'Accedi'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-200 dark:border-surface-800">
            <p className="text-xs text-center text-surface-400 dark:text-surface-500">
              Usa le credenziali Strapi per accedere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

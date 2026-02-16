import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Sun, Moon, Monitor, FileText, Columns, Film, CalendarDays, Home, Link as LinkIcon, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import HelpButton from './HelpButton';
import { useState, useRef, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/articles/new', label: 'Articoli', icon: FileText },
  { to: '/columns/new', label: 'Rubriche', icon: Columns },
  { to: '/video-episodes/new', label: 'Video', icon: Film },
  { to: '/events', label: 'Eventi', icon: CalendarDays },
  { to: '/columns/select-links', label: 'Newsroom', icon: LinkIcon },
  { to: '/calendar', label: 'Calendario', icon: Calendar },
];

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Chiaro' },
    { value: 'dark' as const, icon: Moon, label: 'Scuro' },
    { value: 'system' as const, icon: Monitor, label: 'Sistema' },
  ];

  const CurrentIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800 transition-all duration-200"
        title="Cambia tema"
      >
        <CurrentIcon size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-surface-800 rounded-xl shadow-soft-lg border border-surface-200 dark:border-surface-700 overflow-hidden animate-slide-down z-50">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                theme === option.value
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-surface-600 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700/50'
              }`}
            >
              <option.icon size={16} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    const apiToken = import.meta.env.VITE_API_TOKEN;
    if (apiToken) return;
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.replace('/new', '').replace('/select-links', ''));
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200/60 dark:border-surface-800/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img 
                  src="/logo_capibara.png" 
                  alt="Capibara" 
                  className="h-9 w-9 object-contain rounded-lg"
                />
              </div>
              <h1 className="text-lg font-bold text-surface-900 dark:text-white tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                Capibara Editor
              </h1>
              <span className="badge-primary !text-[10px] !px-1.5 !py-0.5 font-semibold tracking-wide">
                v0.1.0
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <HelpButton />
              <ThemeToggle />
              {!import.meta.env.VITE_API_TOKEN && (
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-surface-500 hover:text-red-600 hover:bg-red-50 dark:text-surface-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation bar */}
        <div className="border-t border-surface-100 dark:border-surface-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-none -mx-1">
              {navItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      active
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800'
                    }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

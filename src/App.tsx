import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CreateColumnPage from './pages/CreateColumn';
import EditColumnPage from './pages/EditColumn';
import ManageColumnLinksPage from './pages/ManageColumnLinks';
import SelectColumnForLinksPage from './pages/SelectColumnForLinks';
import CreateArticlePage from './pages/CreateArticle';
import EditArticlePage from './pages/EditArticle';
import CalendarPage from './pages/CalendarPage';
import CreateVideoEpisodePage from './pages/CreateVideoEpisode';
import EditVideoEpisodePage from './pages/EditVideoEpisode';
import EventsPage from './pages/EventsPage';
import CreateEventPage from './pages/CreateEvent';
import EditEventPage from './pages/EditEvent';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 transition-colors">
        <div className="h-12 w-12 rounded-full border-2 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 transition-colors">
        <div className="h-12 w-12 rounded-full border-2 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

function ThemeInit() {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => {
    initTheme();
  }, [initTheme]);
  return null;
}

function App() {
  return (
    <>
      <ThemeInit />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/columns/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateColumnPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/columns/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EditColumnPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/columns/select-links"
          element={
            <ProtectedRoute>
              <Layout>
                <SelectColumnForLinksPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/columns/:id/links"
          element={
            <ProtectedRoute>
              <Layout>
                <ManageColumnLinksPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/articles/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateArticlePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/articles/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EditArticlePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Layout>
                <CalendarPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/video-episodes/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateVideoEpisodePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/video-episodes/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EditVideoEpisodePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Layout>
                <EventsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateEventPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EditEventPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;

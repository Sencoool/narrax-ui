import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import api from './services/api';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

import MainLayout from './layouts/MainLayout';
// Home stays eager: it is the landing page and the first paint users see.
import Home from './pages/Home';

// Everything else is loaded on demand, so the entry bundle carries only the
// shell + the landing page instead of all thirteen screens.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Discover = lazy(() => import('./pages/Discover'));
const NovelDetails = lazy(() => import('./pages/NovelDetails'));
const Reader = lazy(() => import('./pages/Reader'));
const WriterDashboard = lazy(() => import('./pages/WriterDashboard'));
const NovelEditor = lazy(() => import('./pages/NovelEditor'));
const EpisodeEditor = lazy(() => import('./pages/EpisodeEditor'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const CharacterBoardPage = lazy(() => import('./pages/CharacterBoardPage'));

/** Placeholder shown while a route chunk is being fetched. */
function RouteFallback() {
  return (
    <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Loading…
    </div>
  );
}

/** Handles the Google OAuth callback — extracts ?token= from URL and logs user in */
function AuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      // Fetch user profile and redirect to home
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          login(res.data, token);
          navigate('/', { replace: true });
        })
        .catch(() => {
          navigate('/login', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, login, navigate]);

  return null;
}

function App() {
  // Apply dark class to <html> on initial load based on stored preference
  const { mode } = useThemeStore();
  const { token, user, setUser, logout } = useAuthStore();

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  useEffect(() => {
    if (token && !user) {
      // Fetch user profile on startup if token exists but user is null (e.g. after refresh)
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => logout());
    }
  }, [token, user, setUser, logout]);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public pages — MainLayout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="discover" element={<Discover />} />
            <Route path="novel/:id" element={<NovelDetails />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="profile" element={<UserProfile />} />
              <Route path="settings" element={<Settings />} />

              {/* Writer workspace */}
              <Route path="writer" element={<WriterDashboard />} />
              <Route path="writer/novel/:id" element={<NovelEditor />} />
              <Route path="writer/novel/:id/board" element={<CharacterBoardPage />} />
              <Route path="writer/novel/:novelId/episode/:episodeId" element={<EpisodeEditor />} />
            </Route>
          </Route>

          {/* Reader — distraction-free full screen */}
          <Route path="/read/:novelId/:episodeId" element={<Reader />} />

          {/* Google OAuth callback */}
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

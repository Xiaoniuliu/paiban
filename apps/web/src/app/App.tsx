import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiClient } from './lib/api';
import { createTranslator } from './i18n';
import type { DisplayTimezone, Language, UserProfile } from './types';
import { canAccessRoute, defaultPathForRole, pathForView, routeForPath } from './routes';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import { AccessDeniedPage } from './pages/Pages';
import { TimeDisplayProvider } from './lib/TimeDisplayContext';

const tokenStorageKey = 'pilotRosterToken';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>('zh-CN');
  const [timezone, setTimezone] = useState<DisplayTimezone>('UTC+8');
  const [bootstrapping, setBootstrapping] = useState(Boolean(token));
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const preferenceTouchedRef = useRef(false);
  const currentRoute = routeForPath(location.pathname);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setPreferencesLoaded(false);
    preferenceTouchedRef.current = false;
    navigate('/', { replace: true });
  }, [navigate]);

  const api = useMemo(() => new ApiClient(token, logout), [token]);
  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    api.setToken(token);
  }, [api, token]);

  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }

    setBootstrapping(true);
    api.me()
      .then((profile) => {
        setUser(profile);
      })
      .catch(logout)
      .finally(() => setBootstrapping(false));
  }, [api, token]);

  useEffect(() => {
    if (!token || !user || preferencesLoaded) return;

    api.userPreferences()
      .then((preference) => {
        if (!preferenceTouchedRef.current) {
          setLanguage(preference.language);
          setTimezone(preference.displayTimezone);
        }
      })
      .finally(() => setPreferencesLoaded(true));
  }, [api, preferencesLoaded, token, user]);

  const persistPreference = (nextLanguage: Language, nextTimezone: DisplayTimezone) => {
    if (!token || !user) return;
    void api.updateUserPreferences({ language: nextLanguage, displayTimezone: nextTimezone });
  };

  const handleSetLanguage = (nextLanguage: Language) => {
    preferenceTouchedRef.current = true;
    setPreferencesLoaded(true);
    setLanguage(nextLanguage);
    persistPreference(nextLanguage, timezone);
  };

  const handleSetTimezone = (nextTimezone: DisplayTimezone) => {
    preferenceTouchedRef.current = true;
    setPreferencesLoaded(true);
    setTimezone(nextTimezone);
    persistPreference(language, nextTimezone);
  };

  const handleLogin = async (username: string, password: string) => {
    const result = await api.login(username, password);
    api.setToken(result.token);
    localStorage.setItem(tokenStorageKey, result.token);
    setToken(result.token);
    setUser(result.user);
    setPreferencesLoaded(false);
    preferenceTouchedRef.current = false;
    const targetRoute = routeForPath(location.pathname);
    const targetPath = targetRoute && canAccessRoute(targetRoute, result.user.role)
      ? targetRoute.path
      : defaultPathForRole(result.user.role);
    navigate(targetPath, { replace: true });
  };

  if (bootstrapping) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">{t('loading')}...</div>;
  }

  if (!user || !token) {
    return <LoginPage onLogin={handleLogin} language={language} setLanguage={setLanguage} t={t} />;
  }

  if (!currentRoute) {
    return <Navigate to={defaultPathForRole(user.role)} replace />;
  }

  const activeView = currentRoute.viewId;
  const PageComponent = currentRoute.pageComponent;
  const allowed = canAccessRoute(currentRoute, user.role);

  return (
    <TimeDisplayProvider timezone={timezone}>
      <Layout
        activeView={activeView}
        setActiveView={(view) => navigate(pathForView(view))}
        user={user}
        language={language}
        setLanguage={handleSetLanguage}
        timezone={timezone}
        setTimezone={handleSetTimezone}
        t={t}
        onLogout={logout}
      >
        {allowed ? (
          <PageComponent activeView={activeView} api={api} language={language} timezone={timezone} t={t} user={user} />
        ) : (
          <AccessDeniedPage activeView={activeView} api={api} language={language} timezone={timezone} t={t} user={user} />
        )}
      </Layout>
    </TimeDisplayProvider>
  );
}

/**
 * File: App.tsx
 * Role: Restores authenticated sessions and mounts browser routes.
 * Service: Frontend.
 */
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from './types';
import { api } from './api';
import { AuthPage } from './pages/AuthPage';
import { MailLayout } from './layouts/MailLayout';
import { MailPage } from './pages/MailPage';
import { ProfilePage } from './pages/ProfilePage';
import { MailProvider } from './context/MailContext';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    // Returns to sign-in when an API request proves the stored token is no longer valid.
    const handleInvalidSession = () => setUser(null);
    window.addEventListener('syscall:session-invalid', handleInvalidSession);
    // Validates the browser token with the API instead of trusting cached identity data.
    void (async () => {
      if (!api.getSession()) { setLoading(false); return; }
      try { const authenticatedUser = await api.getMe(); if (!cancelled) setUser(authenticatedUser); }
      catch { api.setSession(null); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; window.removeEventListener('syscall:session-invalid', handleInvalidSession); };
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleSignOut = () => {
    void api.logout().finally(() => setUser(null));
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gmail-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #E0E2EC', borderTopColor: '#0B57D0', animation: 'spin 1s infinite linear' }}></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5E5E5E' }}>Loading Syscall...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/mail/inbox" replace />
            ) : (
              <AuthPage onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            user ? (
              <Navigate to="/mail/inbox" replace />
            ) : (
              <AuthPage onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/reset-password"
          element={user ? <Navigate to="/mail/inbox" replace /> : <AuthPage onAuthSuccess={handleAuthSuccess} />}
        />

        {/* Protected mailbox & app layout routes */}
        <Route
          path="/"
          element={
            user ? (
              <MailProvider initialUser={user} onSignOut={handleSignOut}>
                <MailLayout />
              </MailProvider>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="/mail/inbox" replace />} />
          <Route path="mail" element={<Navigate to="/mail/inbox" replace />} />
          <Route path="mail/:folder" element={<MailPage />} />
          <Route path="mail/:folder/:mailId" element={<MailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback route */}
        <Route
          path="*"
          element={<Navigate to={user ? "/mail/inbox" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

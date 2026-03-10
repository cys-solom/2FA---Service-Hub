/**
 * Service Hub — Main Application Router
 *
 * Routes:
 *   /            → Redirect to /2fa
 *   /2fa         → 2FA TOTP Generator
 *   /2fa/:secret → 2FA with pre-filled secret
 *   /temp-mail   → Temp Mail inbox
 *   /admin       → Admin panel (domains + settings)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import TwoFAPage from './pages/TwoFA';
import TempMailPage from './pages/TempMail';
import AdminPage from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Navigate to="/2fa" replace />} />
        <Route path="/2fa" element={<TwoFAPage />} />
        <Route path="/2fa/:secret" element={<TwoFAPage />} />
        <Route path="/temp-mail" element={<TempMailPage />} />
        <Route path="/temp-mail/:address" element={<TempMailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Fallback: treat unknown paths as 2FA secret for backward compat */}
        <Route path="/:secret" element={<TwoFAPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

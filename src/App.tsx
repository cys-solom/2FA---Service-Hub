/**
 * Service Hub — Main Application Router
 *
 * Routes:
 *   /            → Redirect to /2fa
 *   /2fa         → 2FA TOTP Generator
 *   /2fa/:secret → 2FA with pre-filled secret
 *   /mail          → Service Hub Mail (create mailboxes)
 *   /receive-code  → Receive Code (client inbox checker)
 *   /admin         → Admin panel (hidden, login required)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import TwoFAPage from './pages/TwoFA';
import TempMailPage from './pages/TempMail';
import ReceiveCodePage from './pages/ReceiveCode';
import AdminPage from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Navigate to="/2fa" replace />} />
        <Route path="/2fa" element={<TwoFAPage />} />
        <Route path="/2fa/:secret" element={<TwoFAPage />} />
        <Route path="/mail" element={<TempMailPage />} />
        <Route path="/mail/:address" element={<TempMailPage />} />
        <Route path="/receive-code" element={<ReceiveCodePage />} />
        <Route path="/receive-code/:address" element={<ReceiveCodePage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Fallback: treat unknown paths as 2FA secret for backward compat */}
        <Route path="/:secret" element={<TwoFAPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

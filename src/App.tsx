/**
 * Service Hub — Main Application Router
 *
 * Routes:
 *   /              → Redirect to /2fa-code
 *   /2fa-code      → 2FA TOTP Generator
 *   /2fa-code/:secret → 2FA with pre-filled secret
 *   /receive-code  → Receive Code (client inbox checker)
 *   /admin         → Admin panel (hidden, login required)
 *
 * Performance:
 *   - Lazy-loaded pages for code splitting
 *   - Suspense with loading fallback
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';

// Lazy-loaded pages for code splitting
const TwoFAPage = lazy(() => import('./pages/TwoFA'));
const ReceiveCodePage = lazy(() => import('./pages/ReceiveCode'));
const AdminPage = lazy(() => import('./pages/Admin'));

// Minimal loading spinner matching the deep-space theme
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-400/60 rounded-full animate-spin" />
        <p className="text-white/15 text-xs tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/2fa-code" replace />} />
          <Route path="/2fa-code" element={<TwoFAPage />} />
          <Route path="/2fa-code/:secret" element={<TwoFAPage />} />
          <Route path="/receive-code" element={<ReceiveCodePage />} />
          <Route path="/receive-code/:address" element={<ReceiveCodePage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Fallback: treat unknown paths as 2FA secret for backward compat */}
          <Route path="/:secret" element={<TwoFAPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

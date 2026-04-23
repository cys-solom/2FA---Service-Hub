/**
 * Service Hub - Admin Panel
 * 
 * Protected by email/password login.
 * Accessible only via /admin URL (not in navigation).
 * 
 * Controls:
 *   - Admin credentials
 *   - Service Mail credentials
 *   - Domain management
 *   - Mail maintenance (cleanup/purge)
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import type { ToastData } from '../components/Toast';
import type { AdminConfig, DomainConfig } from '../services/domain-config';
import {
  getAdminConfig,
  addDomain,
  removeDomain,
  setPrimaryDomain,
  toggleDomainActive,
  updateSettings,
  updateDomainSettings,
  loginAdmin,
  isAdminLoggedIn,
  logoutAdmin,
} from '../services/domain-config';
import { purgeAllFromAPI, cleanupOldFromAPI } from '../services/tempmail-service';
import {
  getSubscriptionConfig,
  addProduct,
  updateProduct,
  removeProduct,
  toggleProductActive,
  updateSubscriptionSettings,
} from '../services/subscriptions-service';
import type { SubscriptionProduct, SubscriptionConfig } from '../services/subscriptions-service';

// ─── Login Screen ─────────────────────────────────────────────────

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (loginAdmin(email, password)) {
      onLogin();
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <div className="bg-deep-space">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>
      <div className="stars-layer" />
      <div className="grid-pattern" />
      <div className="noise-overlay" />
      <div className="vignette" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-card p-8 sm:p-10 animate-scale-in">
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-14 h-14 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-amber-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Panel</h1>
            <p className="text-white/20 text-xs mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field !py-3 text-sm" placeholder="admin@..." required autoFocus />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field !py-3 text-sm" placeholder="••••••••" required />
            </div>

            {error && (
              <p className="text-red-400/80 text-xs flex items-center gap-1.5 animate-fade-in">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary-amber w-full !py-3 mt-2">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────

function AdminDashboard() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AdminConfig>(getAdminConfig());
  const [newDomain, setNewDomain] = useState('');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const reload = useCallback(() => setConfig(getAdminConfig()), []);

  const handleAddDomain = useCallback(() => {
    if (!newDomain.trim()) return;
    setDomainError(null);
    const result = addDomain(newDomain.trim());
    if (result.success) {
      setNewDomain('');
      reload();
      addToast(`Domain "${newDomain.trim()}" added`, 'success');
    } else {
      setDomainError(result.error || 'Failed');
    }
  }, [newDomain, reload, addToast]);

  const handleRemove = useCallback((id: string, domain: string) => {
    const result = removeDomain(id);
    if (result.success) { reload(); addToast(`"${domain}" removed`, 'info'); }
    else addToast(result.error || 'Failed', 'error');
  }, [reload, addToast]);

  const handleSetPrimary = useCallback((id: string) => {
    setPrimaryDomain(id); reload(); addToast('Primary updated', 'success');
  }, [reload, addToast]);

  const handleToggleActive = useCallback((id: string) => {
    toggleDomainActive(id); reload();
  }, [reload]);

  const handleSetting = useCallback((key: string, value: number | boolean | string) => {
    updateSettings({ [key]: value }); reload(); addToast('Saved', 'success');
  }, [reload, addToast]);

  const handleLogout = useCallback(() => {
    logoutAdmin();
    navigate('/2fa-code');
  }, [navigate]);

  const toggleShowPassword = useCallback((key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    const interval = setInterval(reload, 3000);
    return () => clearInterval(interval);
  }, [reload]);

  return (
    <div className="min-h-screen relative">
      <div className="bg-deep-space">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>
      <div className="stars-layer" />
      <div className="grid-pattern" />
      <div className="noise-overlay" />
      <div className="vignette" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin Panel</h1>
                <p className="text-[10px] text-white/20">{config.adminEmail}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl text-xs text-white/30 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition-all">
              Logout
            </button>
          </div>

          {/* ── Admin Credentials ─────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-amber-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h2 className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-widest">Admin Credentials</h2>
            </div>
            <div className="space-y-4">
              <SettingRow label="Admin Email" desc="Login email for this panel">
                <input type="email" value={config.adminEmail} onChange={e => handleSetting('adminEmail', e.target.value)}
                  className="input-field !py-2 !px-3 !w-56 text-xs" />
              </SettingRow>
              <div className="h-px bg-white/[0.04]" />
              <SettingRow label="Admin Password" desc="Login password for this panel">
                <div className="flex items-center gap-1.5">
                  <input type={showPasswords['admin'] ? 'text' : 'password'} value={config.adminPassword}
                    onChange={e => handleSetting('adminPassword', e.target.value)}
                    className="input-field !py-2 !px-3 !w-44 text-xs" />
                  <button onClick={() => toggleShowPassword('admin')}
                    className="p-2 rounded-lg text-white/20 hover:text-white/40 transition-all" title="Toggle visibility">
                    {showPasswords['admin'] ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </SettingRow>
            </div>
          </div>

          {/* ── Service Mail Credentials ──────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-violet-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h2 className="text-[10px] font-semibold text-violet-400/60 uppercase tracking-widest">Service Mail Credentials</h2>
            </div>
            <p className="text-[10px] text-white/15 mb-4 -mt-1">Login credentials for the <span className="text-violet-300/40 font-mono">/service-mail</span> page</p>
            <div className="space-y-4">
              <SettingRow label="Service Mail Email" desc="Login email for service mail">
                <input type="email" value={config.serviceMailEmail} onChange={e => handleSetting('serviceMailEmail', e.target.value)}
                  className="input-field !py-2 !px-3 !w-56 text-xs" />
              </SettingRow>
              <div className="h-px bg-white/[0.04]" />
              <SettingRow label="Service Mail Password" desc="Login password for service mail">
                <div className="flex items-center gap-1.5">
                  <input type={showPasswords['smail'] ? 'text' : 'password'} value={config.serviceMailPassword}
                    onChange={e => handleSetting('serviceMailPassword', e.target.value)}
                    className="input-field !py-2 !px-3 !w-44 text-xs" />
                  <button onClick={() => toggleShowPassword('smail')}
                    className="p-2 rounded-lg text-white/20 hover:text-white/40 transition-all" title="Toggle visibility">
                    {showPasswords['smail'] ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </SettingRow>
            </div>
          </div>

          {/* ── Domains ──────────────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-emerald-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <h2 className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-widest">Domains</h2>
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newDomain} onChange={e => { setNewDomain(e.target.value); setDomainError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleAddDomain()} placeholder="example.com" className="input-field !py-2.5 text-sm flex-1" />
              <button onClick={handleAddDomain} className="btn-primary-emerald !px-4 !py-2.5 !text-xs">Add</button>
            </div>
            {domainError && <p className="text-red-400/70 text-xs mb-3">{domainError}</p>}
            <div className="space-y-1.5">
              {config.domains.map(d => (
                <DomainRow key={d.id} domain={d} onSetPrimary={handleSetPrimary} onToggleActive={handleToggleActive} onRemove={handleRemove} onReload={reload} />
              ))}
            </div>
          </div>

          {/* ── Maintenance ───────────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-red-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-[10px] font-semibold text-red-400/50 uppercase tracking-widest">Maintenance</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/50">Clean 30+ day messages</p>
                  <p className="text-[10px] text-white/15">Auto-remove old emails from server</p>
                </div>
                <button onClick={async () => { const c = await cleanupOldFromAPI(30); addToast(`Cleaned ${c} old messages`, 'info'); }}
                  className="btn bg-white/[0.03] text-yellow-300/60 border border-white/[0.05] hover:bg-yellow-500/10 hover:text-yellow-300 !py-1.5 !px-3 !text-[10px]">
                  Clean
                </button>
              </div>
              <div className="h-px bg-white/[0.04]" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/50">Purge all messages</p>
                  <p className="text-[10px] text-white/15">Delete ALL emails from IMAP</p>
                </div>
                <button onClick={async () => {
                  if (confirm('Delete ALL emails permanently?')) {
                    const c = await purgeAllFromAPI(); addToast(`Purged ${c} messages`, 'info');
                  }
                }} className="btn-danger !py-1.5 !px-3 !text-[10px]">
                  Purge All
                </button>
              </div>
            </div>
          </div>

          {/* ── Subscriptions Management ─────────────── */}
          <SubscriptionsAdmin addToast={addToast} />

          <div className="h-6" />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// ─── Main Admin Page (Login Gate) ─────────────────────────────────

function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn());

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  return <AdminDashboard />;
}

// ─── Sub-components ───────────────────────────────────────────────

function DomainRow({ domain, onSetPrimary, onToggleActive, onRemove, onReload }: {
  domain: DomainConfig;
  onSetPrimary: (id: string) => void;
  onToggleActive: (id: string) => void;
  onRemove: (id: string, d: string) => void;
  onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleDomainField = (key: string, value: string | number | boolean) => {
    updateDomainSettings(domain.id, { [key]: value });
    onReload();
  };

  return (
    <div className={`rounded-xl border transition-all ${
      domain.isActive ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white/[0.01] border-white/[0.03] opacity-40'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-2.5 p-2.5">
        <div className={`w-1.5 h-1.5 rounded-full ${domain.isActive ? 'bg-emerald-400' : 'bg-white/10'}`} />
        <button onClick={() => setExpanded(!expanded)} className="font-mono text-xs text-white/60 flex-1 truncate text-left hover:text-white/80 transition-all">
          {domain.domain}
        </button>
        {domain.isPrimary && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/15 text-amber-400/70 border border-amber-500/15">Primary</span>
        )}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded text-white/10 hover:text-white/30 transition-all" title="Configure">
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {!domain.isPrimary && domain.isActive && (
            <button onClick={() => onSetPrimary(domain.id)} className="p-1 rounded text-white/10 hover:text-amber-400/50 transition-all" title="Set primary">★</button>
          )}
          <button onClick={() => onToggleActive(domain.id)} className={`p-1 rounded transition-all ${domain.isActive ? 'text-emerald-400/30 hover:text-emerald-400' : 'text-white/10 hover:text-white/30'}`} title="Toggle">
            {domain.isActive ? '●' : '○'}
          </button>
          {!domain.isPrimary && (
            <button onClick={() => onRemove(domain.id, domain.domain)} className="p-1 rounded text-white/10 hover:text-red-400/50 transition-all" title="Remove">✕</button>
          )}
        </div>
      </div>

      {/* Expanded IMAP/SMTP settings */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/[0.04] space-y-3 animate-fade-in">
          {/* IMAP */}
          <div>
            <p className="text-[9px] font-semibold text-emerald-400/50 uppercase tracking-widest mb-2">IMAP (Receive)</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={domain.imapHost || ''} onChange={e => handleDomainField('imapHost', e.target.value)}
                placeholder="IMAP Host" className="input-field !py-1.5 !px-2.5 !text-[11px] col-span-2" />
              <input type="number" value={domain.imapPort || 993} onChange={e => handleDomainField('imapPort', Number(e.target.value))}
                placeholder="Port" className="input-field !py-1.5 !px-2.5 !text-[11px]" />
              <label className="flex items-center gap-2 text-[11px] text-white/30 cursor-pointer">
                <input type="checkbox" checked={domain.imapTls !== false} onChange={e => handleDomainField('imapTls', e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30 w-3.5 h-3.5" />
                TLS / SSL
              </label>
              <input type="text" value={domain.imapUser || ''} onChange={e => handleDomainField('imapUser', e.target.value)}
                placeholder="Username / Email" className="input-field !py-1.5 !px-2.5 !text-[11px]" />
              <input type="password" value={domain.imapPassword || ''} onChange={e => handleDomainField('imapPassword', e.target.value)}
                placeholder="Password" className="input-field !py-1.5 !px-2.5 !text-[11px]" />
            </div>
          </div>

          {/* SMTP */}
          <div>
            <p className="text-[9px] font-semibold text-blue-400/50 uppercase tracking-widest mb-2">SMTP (Send)</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={domain.smtpHost || ''} onChange={e => handleDomainField('smtpHost', e.target.value)}
                placeholder="SMTP Host" className="input-field !py-1.5 !px-2.5 !text-[11px] col-span-2" />
              <input type="number" value={domain.smtpPort || 587} onChange={e => handleDomainField('smtpPort', Number(e.target.value))}
                placeholder="Port" className="input-field !py-1.5 !px-2.5 !text-[11px]" />
              <label className="flex items-center gap-2 text-[11px] text-white/30 cursor-pointer">
                <input type="checkbox" checked={domain.smtpTls !== false} onChange={e => handleDomainField('smtpTls', e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5" />
                TLS / STARTTLS
              </label>
              <input type="text" value={domain.smtpUser || ''} onChange={e => handleDomainField('smtpUser', e.target.value)}
                placeholder="Username / Email" className="input-field !py-1.5 !px-2.5 !text-[11px]" />
              <input type="password" value={domain.smtpPassword || ''} onChange={e => handleDomainField('smtpPassword', e.target.value)}
                placeholder="Password" className="input-field !py-1.5 !px-2.5 !text-[11px]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white/50 font-medium">{label}</p>
        <p className="text-[10px] text-white/15 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Subscriptions Admin ──────────────────────────────────────────

const PRODUCT_COLORS = [
  { key: 'blue', label: 'Blue', cls: 'bg-blue-500' },
  { key: 'emerald', label: 'Green', cls: 'bg-emerald-500' },
  { key: 'violet', label: 'Violet', cls: 'bg-violet-500' },
  { key: 'pink', label: 'Pink', cls: 'bg-pink-500' },
  { key: 'amber', label: 'Amber', cls: 'bg-amber-500' },
  { key: 'cyan', label: 'Cyan', cls: 'bg-cyan-500' },
];

const PRODUCT_CATEGORIES = [
  { key: 'ai', label: 'AI Tools' },
  { key: 'design', label: 'Design' },
  { key: 'video', label: 'Video' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'other', label: 'Other' },
];

const EMPTY_PRODUCT: Omit<SubscriptionProduct, 'id' | 'createdAt'> = {
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  price: '',
  priceAr: '',
  duration: '1 Month',
  durationAr: 'شهر واحد',
  category: 'ai',
  icon: '✦',
  color: 'blue',
  features: [''],
  featuresAr: [''],
  isActive: true,
  badge: '',
  badgeAr: '',
  order: 0,
};

function SubscriptionsAdmin({ addToast }: { addToast: (msg: string, type?: ToastData['type']) => void }) {
  const [subConfig, setSubConfig] = useState<SubscriptionConfig>(getSubscriptionConfig());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [featureInput, setFeatureInput] = useState('');
  const [featureArInput, setFeatureArInput] = useState('');

  const reload = useCallback(() => setSubConfig(getSubscriptionConfig()), []);

  const handleAddOrUpdate = useCallback(() => {
    if (!form.name.trim() || !form.price.trim()) {
      addToast('Name and Price are required', 'error');
      return;
    }
    if (editingId) {
      updateProduct(editingId, form);
      addToast(`"${form.name}" updated`, 'success');
    } else {
      const products = subConfig.products;
      addProduct({ ...form, order: products.length });
      addToast(`"${form.name}" added`, 'success');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    reload();
  }, [form, editingId, addToast, reload, subConfig.products]);

  const handleEdit = useCallback((product: SubscriptionProduct) => {
    setForm(product);
    setEditingId(product.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      removeProduct(id);
      addToast(`"${name}" deleted`, 'info');
      reload();
    }
  }, [addToast, reload]);

  const handleToggle = useCallback((id: string) => {
    toggleProductActive(id);
    reload();
  }, [reload]);

  const handleSettingChange = useCallback((key: string, value: string) => {
    updateSubscriptionSettings({ [key]: value } as any);
    reload();
    addToast('Saved', 'success');
  }, [reload, addToast]);

  const addFeature = useCallback(() => {
    if (featureInput.trim()) {
      setForm(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
      setFeatureInput('');
    }
  }, [featureInput]);

  const addFeatureAr = useCallback(() => {
    if (featureArInput.trim()) {
      setForm(prev => ({ ...prev, featuresAr: [...prev.featuresAr, featureArInput.trim()] }));
      setFeatureArInput('');
    }
  }, [featureArInput]);

  const removeFeature = useCallback((index: number) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  }, []);

  const removeFeatureAr = useCallback((index: number) => {
    setForm(prev => ({ ...prev, featuresAr: prev.featuresAr.filter((_, i) => i !== index) }));
  }, []);

  return (
    <>
      {/* ── WhatsApp Settings ────────────────────── */}
      <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-green-400/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <h2 className="text-[10px] font-semibold text-green-400/60 uppercase tracking-widest">WhatsApp & Subscriptions Settings</h2>
        </div>
        <div className="space-y-4">
          <SettingRow label="WhatsApp Number" desc="Phone number for order messages (with country code, no +)">
            <input type="text" value={subConfig.whatsappNumber} onChange={e => handleSettingChange('whatsappNumber', e.target.value)}
              className="input-field !py-2 !px-3 !w-48 text-xs" placeholder="201000000000" />
          </SettingRow>
          <div className="h-px bg-white/[0.04]" />
          <SettingRow label="Message Template (EN)" desc="Use {product} and {price} as placeholders">
            <input type="text" value={subConfig.whatsappMessage} onChange={e => handleSettingChange('whatsappMessage', e.target.value)}
              className="input-field !py-2 !px-3 !w-64 text-xs" />
          </SettingRow>
          <div className="h-px bg-white/[0.04]" />
          <SettingRow label="Message Template (AR)" desc="قالب الرسالة بالعربي">
            <input type="text" value={subConfig.whatsappMessageAr} onChange={e => handleSettingChange('whatsappMessageAr', e.target.value)}
              className="input-field !py-2 !px-3 !w-64 text-xs" dir="rtl" />
          </SettingRow>
          <div className="h-px bg-white/[0.04]" />
          <SettingRow label="Page Title (EN)" desc="Heading shown on subscriptions page">
            <input type="text" value={subConfig.pageTitle} onChange={e => handleSettingChange('pageTitle', e.target.value)}
              className="input-field !py-2 !px-3 !w-56 text-xs" />
          </SettingRow>
          <div className="h-px bg-white/[0.04]" />
          <SettingRow label="Page Title (AR)" desc="عنوان الصفحة بالعربي">
            <input type="text" value={subConfig.pageTitleAr} onChange={e => handleSettingChange('pageTitleAr', e.target.value)}
              className="input-field !py-2 !px-3 !w-56 text-xs" dir="rtl" />
          </SettingRow>
        </div>
      </div>

      {/* ── Products List ────────────────────────── */}
      <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h2 className="text-[10px] font-semibold text-rose-400/60 uppercase tracking-widest">Subscription Products</h2>
          </div>
          <button
            onClick={() => { setForm(EMPTY_PRODUCT); setEditingId(null); setShowForm(!showForm); }}
            className="px-3 py-1.5 rounded-xl text-xs text-rose-300/60 bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 hover:text-rose-300 transition-all"
          >
            {showForm ? '✕ Close' : '+ Add Product'}
          </button>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="mb-5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4 animate-fade-in">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              {editingId ? 'Edit Product' : 'New Product'}
            </p>

            {/* Row 1: Name & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Name (EN)</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px]" placeholder="Gemini Pro" />
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Name (AR)</label>
                <input type="text" value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px]" dir="rtl" placeholder="جيميني برو" />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Description (EN)</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px] resize-none h-16" placeholder="Short description..." />
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Description (AR)</label>
                <textarea value={form.descriptionAr} onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px] resize-none h-16" dir="rtl" placeholder="وصف قصير..." />
              </div>
            </div>

            {/* Row 3: Price, Duration, Icon */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Price (EN)</label>
                <input type="text" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px]" placeholder="$20/mo" />
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Price (AR)</label>
                <input type="text" value={form.priceAr} onChange={e => setForm(p => ({ ...p, priceAr: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px]" dir="rtl" placeholder="$20/شهر" />
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Duration (EN)</label>
                <input type="text" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px]" placeholder="1 Month" />
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Icon</label>
                <input type="text" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px] text-center" placeholder="✦" />
              </div>
            </div>

            {/* Row 4: Category, Color, Badge */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="input-field !py-1.5 !px-2.5 !text-[11px]">
                  {PRODUCT_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Color</label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {PRODUCT_COLORS.map(c => (
                    <button key={c.key} onClick={() => setForm(p => ({ ...p, color: c.key }))}
                      className={`w-5 h-5 rounded-full ${c.cls} transition-all ${form.color === c.key ? 'ring-2 ring-white/40 scale-110' : 'opacity-40 hover:opacity-70'}`}
                      title={c.label} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-white/20 mb-1">Badge (EN / AR)</label>
                <div className="grid grid-cols-2 gap-1">
                  <input type="text" value={form.badge || ''} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
                    className="input-field !py-1 !px-2 !text-[10px]" placeholder="Popular" />
                  <input type="text" value={form.badgeAr || ''} onChange={e => setForm(p => ({ ...p, badgeAr: e.target.value }))}
                    className="input-field !py-1 !px-2 !text-[10px]" dir="rtl" placeholder="شائع" />
                </div>
              </div>
            </div>

            {/* Features EN */}
            <div>
              <label className="block text-[9px] text-white/20 mb-1">Features (EN)</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {form.features.filter(f => f).map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.05] text-[10px] text-white/40 border border-white/[0.06]">
                    {f}
                    <button onClick={() => removeFeature(i)} className="text-white/20 hover:text-red-400 transition-colors">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  className="input-field !py-1 !px-2.5 !text-[11px] flex-1" placeholder="Add feature..." />
                <button onClick={addFeature} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/30 text-[10px] hover:bg-white/[0.08] transition-all">+</button>
              </div>
            </div>

            {/* Features AR */}
            <div>
              <label className="block text-[9px] text-white/20 mb-1">Features (AR)</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {form.featuresAr.filter(f => f).map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.05] text-[10px] text-white/40 border border-white/[0.06]">
                    {f}
                    <button onClick={() => removeFeatureAr(i)} className="text-white/20 hover:text-red-400 transition-colors">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" value={featureArInput} onChange={e => setFeatureArInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureAr())}
                  className="input-field !py-1 !px-2.5 !text-[11px] flex-1" dir="rtl" placeholder="أضف ميزة..." />
                <button onClick={addFeatureAr} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/30 text-[10px] hover:bg-white/[0.08] transition-all">+</button>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_PRODUCT); }}
                className="px-4 py-2 rounded-xl text-xs text-white/30 hover:text-white/50 transition-all">
                Cancel
              </button>
              <button onClick={handleAddOrUpdate}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-600 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all">
                {editingId ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        )}

        {/* Products list */}
        <div className="space-y-1.5">
          {subConfig.products.length === 0 ? (
            <p className="text-xs text-white/15 text-center py-6">No products yet. Click "+ Add Product" to get started.</p>
          ) : (
            subConfig.products.map(product => (
              <div key={product.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                product.isActive ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white/[0.01] border-white/[0.03] opacity-40'
              }`}>
                <span className="text-lg w-8 text-center">{product.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 font-medium truncate">{product.name}</p>
                  <p className="text-[10px] text-white/20 truncate">{product.price} · {product.category}</p>
                </div>
                {product.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-rose-500/15 text-rose-400/70 border border-rose-500/15">
                    {product.badge}
                  </span>
                )}
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handleEdit(product)} className="p-1 rounded text-white/10 hover:text-white/40 transition-all" title="Edit">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => handleToggle(product.id)}
                    className={`p-1 rounded transition-all ${product.isActive ? 'text-emerald-400/30 hover:text-emerald-400' : 'text-white/10 hover:text-white/30'}`}
                    title="Toggle">
                    {product.isActive ? '●' : '○'}
                  </button>
                  <button onClick={() => handleDelete(product.id, product.name)}
                    className="p-1 rounded text-white/10 hover:text-red-400/50 transition-all" title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default AdminPage;


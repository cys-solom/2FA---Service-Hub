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


// â”€â”€â”€ Login Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                className="input-field !py-3 text-sm" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required />
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

// â”€â”€â”€ Admin Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

          {/* â”€â”€ Admin Credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* â”€â”€ Service Mail Credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* â”€â”€ Domains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* â”€â”€ Maintenance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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



          <div className="h-6" />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// â”€â”€â”€ Main Admin Page (Login Gate) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn());

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  return <AdminDashboard />;
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <button onClick={() => onSetPrimary(domain.id)} className="p-1 rounded text-white/10 hover:text-amber-400/50 transition-all" title="Set primary">â˜…</button>
          )}
          <button onClick={() => onToggleActive(domain.id)} className={`p-1 rounded transition-all ${domain.isActive ? 'text-emerald-400/30 hover:text-emerald-400' : 'text-white/10 hover:text-white/30'}`} title="Toggle">
            {domain.isActive ? 'â—' : 'â—‹'}
          </button>
          {!domain.isPrimary && (
            <button onClick={() => onRemove(domain.id, domain.domain)} className="p-1 rounded text-white/10 hover:text-red-400/50 transition-all" title="Remove">âœ•</button>
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

export default AdminPage;

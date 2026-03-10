/**
 * Service Hub - Admin Panel
 * 
 * Protected by email/password login.
 * Accessible only via /admin URL (not in navigation).
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
  loginAdmin,
  isAdminLoggedIn,
  logoutAdmin,
} from '../services/domain-config';
import { purgeAllFromAPI, cleanupOldFromAPI } from '../services/tempmail-service';

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
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-card p-8 sm:p-10 animate-scale-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-14 h-14 rounded-2xl bg-violet-500/20 blur-xl animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Panel</h1>
            <p className="text-white/20 text-xs mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field !py-3 text-sm"
                placeholder="admin@..."
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field !py-3 text-sm"
                placeholder="••••••••"
                required
              />
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

            <button type="submit" className="btn-primary w-full !py-3 mt-2">
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
    navigate('/temp-mail');
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(reload, 3000);
    return () => clearInterval(interval);
  }, [reload]);

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
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

          {/* ── Domains ──────────────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
            <h2 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-4">Domains</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newDomain} onChange={e => { setNewDomain(e.target.value); setDomainError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleAddDomain()} placeholder="example.com" className="input-field !py-2.5 text-sm flex-1" />
              <button onClick={handleAddDomain} className="btn-primary !px-4 !py-2.5 !text-xs">Add</button>
            </div>
            {domainError && <p className="text-red-400/70 text-xs mb-3">{domainError}</p>}
            <div className="space-y-1.5">
              {config.domains.map(d => (
                <DomainRow key={d.id} domain={d} onSetPrimary={handleSetPrimary} onToggleActive={handleToggleActive} onRemove={handleRemove} />
              ))}
            </div>
          </div>

          {/* ── Security ─────────────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <h2 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-4">Security</h2>
            <div className="space-y-4">
              <SettingRow label="Admin Email" desc="Login email for this panel">
                <input type="email" value={config.adminEmail} onChange={e => handleSetting('adminEmail', e.target.value)}
                  className="input-field !py-2 !px-3 !w-48 text-xs" />
              </SettingRow>
              <div className="h-px bg-white/[0.04]" />
              <SettingRow label="Admin Password" desc="Login password for this panel">
                <input type="password" value={config.adminPassword} onChange={e => handleSetting('adminPassword', e.target.value)}
                  className="input-field !py-2 !px-3 !w-48 text-xs" />
              </SettingRow>
              <div className="h-px bg-white/[0.04]" />
              <SettingRow label="Create Code" desc="Secret code users need to create new mailboxes">
                <input type="text" value={config.createCode} onChange={e => handleSetting('createCode', e.target.value)}
                  className="input-field !py-2 !px-3 !w-32 text-xs font-mono text-center" />
              </SettingRow>
            </div>
          </div>

          {/* ── Mail Settings ────────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
            <h2 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-4">Mail Settings</h2>
            <div className="space-y-4">
              <SettingRow label="Max mailboxes" desc="Per user limit">
                <input type="number" min={1} max={50} value={config.maxMailboxes}
                  onChange={e => handleSetting('maxMailboxes', Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="input-field !py-2 !px-3 !w-20 text-xs text-center" />
              </SettingRow>
              <div className="h-px bg-white/[0.04]" />
              <SettingRow label="Max messages" desc="Per mailbox limit">
                <input type="number" min={5} max={500} value={config.maxMessages}
                  onChange={e => handleSetting('maxMessages', Math.max(5, Math.min(500, Number(e.target.value))))}
                  className="input-field !py-2 !px-3 !w-20 text-xs text-center" />
              </SettingRow>
            </div>
          </div>

          {/* ── Danger Zone ──────────────────────────── */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
            <h2 className="text-[10px] font-semibold text-red-400/50 uppercase tracking-widest mb-4">Danger Zone</h2>
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

// ─── Main Admin Page (Login Gate) ─────────────────────────────────

function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn());

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  return <AdminDashboard />;
}

// ─── Sub-components ───────────────────────────────────────────────

function DomainRow({ domain, onSetPrimary, onToggleActive, onRemove }: {
  domain: DomainConfig;
  onSetPrimary: (id: string) => void;
  onToggleActive: (id: string) => void;
  onRemove: (id: string, d: string) => void;
}) {
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
      domain.isActive ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white/[0.01] border-white/[0.03] opacity-40'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${domain.isActive ? 'bg-emerald-400' : 'bg-white/10'}`} />
      <span className="font-mono text-xs text-white/60 flex-1 truncate">{domain.domain}</span>
      {domain.isPrimary && (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-violet-500/15 text-violet-400/70 border border-violet-500/15">Primary</span>
      )}
      <div className="flex items-center gap-0.5">
        {!domain.isPrimary && domain.isActive && (
          <button onClick={() => onSetPrimary(domain.id)} className="p-1 rounded text-white/10 hover:text-violet-400/50 transition-all" title="Set primary">★</button>
        )}
        <button onClick={() => onToggleActive(domain.id)} className={`p-1 rounded transition-all ${domain.isActive ? 'text-emerald-400/30 hover:text-emerald-400' : 'text-white/10 hover:text-white/30'}`} title="Toggle">
          {domain.isActive ? '●' : '○'}
        </button>
        {!domain.isPrimary && (
          <button onClick={() => onRemove(domain.id, domain.domain)} className="p-1 rounded text-white/10 hover:text-red-400/50 transition-all" title="Remove">✕</button>
        )}
      </div>
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

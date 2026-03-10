/**
 * Service Hub - Admin Panel
 * 
 * Manage domains, settings, and temp mail configuration.
 */

import { useState, useCallback, useEffect } from 'react';
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
} from '../services/domain-config';
import { purgeAllFromAPI, cleanupOldFromAPI } from '../services/tempmail-service';

function AdminPage() {
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
      setDomainError(result.error || 'Failed to add domain');
    }
  }, [newDomain, reload, addToast]);

  const handleRemove = useCallback((id: string, domain: string) => {
    const result = removeDomain(id);
    if (result.success) {
      reload();
      addToast(`Domain "${domain}" removed`, 'info');
    } else {
      addToast(result.error || 'Failed to remove', 'error');
    }
  }, [reload, addToast]);

  const handleSetPrimary = useCallback((id: string) => {
    setPrimaryDomain(id);
    reload();
    addToast('Primary domain updated', 'success');
  }, [reload, addToast]);

  const handleToggleActive = useCallback((id: string) => {
    toggleDomainActive(id);
    reload();
  }, [reload]);

  const handleUpdateSetting = useCallback((key: string, value: number | boolean) => {
    updateSettings({ [key]: value });
    reload();
    addToast('Settings saved', 'success');
  }, [reload, addToast]);

  // Sync config periodically
  useEffect(() => {
    const interval = setInterval(reload, 2000);
    return () => clearInterval(interval);
  }, [reload]);

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8 pt-20">
        <div className="w-full max-w-2xl space-y-6">

          {/* Header */}
          <div className="text-center mb-8 animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="relative inline-flex items-center justify-center mb-5">
              <div className="absolute w-16 h-16 rounded-2xl bg-violet-500/20 blur-xl animate-pulse" />
              <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">
              <span className="text-white">Admin</span>
              <span className="text-white/30 mx-1.5">-</span>
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Settings</span>
            </h1>
            <p className="text-white/25 text-xs sm:text-sm font-light tracking-wide">
              Manage domains and configuration
            </p>
          </div>

          {/* ── Domains ─────────────────────────────────────────── */}
          <div className="glass-card p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
              Email Domains
            </h2>

            {/* Add domain form */}
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => { setNewDomain(e.target.value); setDomainError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                placeholder="example.com"
                className="input-field !py-3 text-sm flex-1"
                aria-label="New domain name"
              />
              <button onClick={handleAddDomain} className="btn-primary !px-5 !py-3 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            {domainError && (
              <div className="flex items-center gap-2 text-red-400/80 text-xs mb-4 animate-fade-in">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{domainError}</span>
              </div>
            )}

            {/* Domain list */}
            <div className="space-y-2">
              {config.domains.map((domain) => (
                <DomainRow
                  key={domain.id}
                  domain={domain}
                  onSetPrimary={handleSetPrimary}
                  onToggleActive={handleToggleActive}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {config.domains.length === 0 && (
              <p className="text-white/15 text-xs text-center py-6">No domains configured</p>
            )}
          </div>

          {/* ── Settings ────────────────────────────────────────── */}
          <div className="glass-card p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
              Temp Mail Settings
            </h2>

            <div className="space-y-5">
              {/* Default TTL */}
              <SettingRow
                label="Default mailbox expiry"
                description="How long new mailboxes last by default"
              >
                <select
                  value={config.mailboxTTL}
                  onChange={(e) => handleUpdateSetting('mailboxTTL', Number(e.target.value))}
                  className="input-field !py-2 !px-3 !w-36 text-xs"
                >
                  <option value={10}>10 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={1440}>24 hours</option>
                </select>
              </SettingRow>

              <div className="h-px bg-white/[0.04]" />

              {/* Max mailboxes */}
              <SettingRow
                label="Max mailboxes per user"
                description="Maximum active mailboxes allowed simultaneously"
              >
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.maxMailboxes}
                  onChange={(e) => handleUpdateSetting('maxMailboxes', Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="input-field !py-2 !px-3 !w-20 text-xs text-center"
                />
              </SettingRow>

              <div className="h-px bg-white/[0.04]" />

              {/* Max messages */}
              <SettingRow
                label="Max messages per mailbox"
                description="Maximum emails a single mailbox can receive"
              >
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={config.maxMessages}
                  onChange={(e) => handleUpdateSetting('maxMessages', Math.max(5, Math.min(200, Number(e.target.value))))}
                  className="input-field !py-2 !px-3 !w-20 text-xs text-center"
                />
              </SettingRow>

              <div className="h-px bg-white/[0.04]" />

              {/* Guest mode */}
              <SettingRow
                label="Guest mode"
                description="Allow unauthenticated users to create mailboxes"
              >
                <button
                  onClick={() => handleUpdateSetting('guestMode', !config.guestMode)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                    config.guestMode
                      ? 'bg-violet-500/30 border border-violet-500/40'
                      : 'bg-white/[0.06] border border-white/[0.08]'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                    config.guestMode
                      ? 'left-[22px] bg-violet-400'
                      : 'left-0.5 bg-white/20'
                  }`} />
                </button>
              </SettingRow>
            </div>
          </div>

          {/* ── DNS Setup Guide ─────────────────────────────────── */}
          <div className="glass-card p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-5">
              DNS Configuration Guide
            </h2>

            <div className="space-y-3 text-xs text-white/40">
              <p className="text-white/60 text-sm mb-4">
                Add these DNS records to your domain to enable email receiving:
              </p>

              <DNSRecord type="MX" name="@" value="mail.servicehub-mail.cloud" priority="10" />
              <DNSRecord type="TXT" name="@" value="v=spf1 ip4:YOUR_SERVER_IP ~all" />
              <DNSRecord type="TXT" name="_dmarc" value="v=DMARC1; p=none; rua=mailto:admin@servicehub-mail.cloud" />
              <DNSRecord type="TXT" name="mail._domainkey" value="v=DKIM1; k=rsa; p=YOUR_DKIM_PUBLIC_KEY" />

              <div className="mt-4 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/10">
                <p className="text-violet-300/60 text-[11px] leading-relaxed">
                  💡 Replace <code className="text-violet-300/80">YOUR_SERVER_IP</code> and <code className="text-violet-300/80">YOUR_DKIM_PUBLIC_KEY</code> with 
                  your actual values after setting up the mail server.
                </p>
              </div>
            </div>
          </div>

          {/* ── Danger Zone ─────────────────────────────────────── */}
          <div className="glass-card p-6 sm:p-8 animate-fade-in-up border-red-500/10" style={{ animationDelay: '0.35s', opacity: 0 }}>
            <h2 className="text-xs font-semibold text-red-400/60 uppercase tracking-widest mb-5">
              Danger Zone
            </h2>

            <div className="space-y-4">
              {/* Clean old messages */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/60 font-medium">Clean old messages</p>
                  <p className="text-[11px] text-white/20 mt-0.5">Delete emails older than 30 days from the server</p>
                </div>
                <button
                  onClick={async () => {
                    const count = await cleanupOldFromAPI(30);
                    addToast(`Cleaned ${count} message(s) older than 30 days`, 'info');
                  }}
                  className="btn bg-white/[0.04] text-yellow-300/70 border border-white/[0.06] hover:bg-yellow-500/10 hover:border-yellow-500/20 hover:text-yellow-300 !py-2 !px-4 !text-xs flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Clean 30+ days
                </button>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* Purge all */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/60 font-medium">Purge all messages</p>
                  <p className="text-[11px] text-white/20 mt-0.5">Delete ALL emails from the IMAP inbox for all temp addresses</p>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure? This will permanently delete ALL emails from the mail server.')) {
                      const count = await purgeAllFromAPI();
                      addToast(`Purged ${count} message(s) from server`, 'info');
                    }
                  }}
                  className="btn-danger !py-2 !px-4 !text-xs flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Purge All
                </button>
              </div>
            </div>
          </div>

          {/* Footer space */}
          <div className="h-8" />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function DomainRow({ domain, onSetPrimary, onToggleActive, onRemove }: {
  domain: DomainConfig;
  onSetPrimary: (id: string) => void;
  onToggleActive: (id: string) => void;
  onRemove: (id: string, domain: string) => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      domain.isActive
        ? 'bg-white/[0.02] border-white/[0.06]'
        : 'bg-white/[0.01] border-white/[0.03] opacity-50'
    }`}>
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        domain.isActive ? 'bg-emerald-400' : 'bg-white/10'
      }`} />

      {/* Domain name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-white/70 truncate">{domain.domain}</span>
          {domain.isPrimary && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-violet-500/15 text-violet-400/80 border border-violet-500/20">
              Primary
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!domain.isPrimary && domain.isActive && (
          <button
            onClick={() => onSetPrimary(domain.id)}
            className="p-1.5 rounded-lg text-white/15 hover:text-violet-400/60 hover:bg-violet-500/[0.06] transition-all"
            title="Set as primary"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        )}

        <button
          onClick={() => onToggleActive(domain.id)}
          className={`p-1.5 rounded-lg transition-all ${
            domain.isActive
              ? 'text-emerald-400/40 hover:text-emerald-400/80 hover:bg-emerald-500/[0.06]'
              : 'text-white/15 hover:text-white/40 hover:bg-white/[0.04]'
          }`}
          title={domain.isActive ? 'Deactivate' : 'Activate'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={domain.isActive
                ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              }
            />
          </svg>
        </button>

        {!domain.isPrimary && (
          <button
            onClick={() => onRemove(domain.id, domain.domain)}
            className="p-1.5 rounded-lg text-white/15 hover:text-red-400/60 hover:bg-red-500/[0.06] transition-all"
            title="Remove domain"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white/60 font-medium">{label}</p>
        <p className="text-[11px] text-white/20 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function DNSRecord({ type, name, value, priority }: {
  type: string;
  name: string;
  value: string;
  priority?: string;
}) {
  return (
    <div className="flex gap-2 items-start p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] font-mono text-[11px]">
      <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400/80 font-semibold flex-shrink-0">{type}</span>
      <div className="flex-1 min-w-0">
        <span className="text-white/40">{name}</span>
        <span className="text-white/10 mx-1.5">→</span>
        <span className="text-white/50 break-all">{value}</span>
        {priority && <span className="text-white/20 ml-1.5">Priority: {priority}</span>}
      </div>
    </div>
  );
}

export default AdminPage;

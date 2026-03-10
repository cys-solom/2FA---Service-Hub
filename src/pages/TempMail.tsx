/**
 * Service Hub - Temp Mail Page
 *
 * Features:
 *   - Check existing inbox or create new Random/Custom email
 *   - Direct links: /temp-mail/email@domain
 *   - Delete messages, clear inbox
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import TempMailHeader from '../components/tempmail/TempMailHeader';
import MailboxCard from '../components/tempmail/MailboxCard';
import InboxList from '../components/tempmail/InboxList';
import MessageView from '../components/tempmail/MessageView';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import type { ToastData } from '../components/Toast';
import type { TempMailbox, TempMessage } from '../services/tempmail-service';
import {
  createMailbox,
  createCustomMailbox,
  getAllMailboxes,
  refreshInbox,
  getInbox,
  getFullMessage,
  getUnreadCount,
  deleteMailbox,
  deleteMessage,
  clearMailboxMessages,
  triggerAutoCleanup,
} from '../services/tempmail-service';
import { getPrimaryDomain } from '../services/domain-config';

function TempMailPage() {
  const { address: urlAddress } = useParams<{ address?: string }>();
  const [mailbox, setMailbox] = useState<TempMailbox | null>(null);
  const [savedMailboxes, setSavedMailboxes] = useState<TempMailbox[]>([]);
  const [messages, setMessages] = useState<TempMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<TempMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [checkEmail, setCheckEmail] = useState('');
  const [createMode, setCreateMode] = useState<'random' | 'custom'>('random');
  const [customPrefix, setCustomPrefix] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const domain = getPrimaryDomain();

  // On mount: cleanup + load saved + handle URL address
  useEffect(() => {
    triggerAutoCleanup();
    const saved = getAllMailboxes();
    setSavedMailboxes(saved);

    // If URL has an address, auto-load it
    if (urlAddress && urlAddress.includes('@')) {
      handleCheckEmail(decodeURIComponent(urlAddress));
    } else if (saved.length > 0) {
      setMailbox(saved[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh inbox from IMAP
  const handleRefresh = useCallback(async (silent = false) => {
    if (!mailbox) return;
    if (!silent) setIsRefreshing(true);
    try {
      const fresh = await refreshInbox(mailbox.id);
      setMessages(fresh);
      setUnreadCount(getUnreadCount(mailbox.id));
    } catch {
      if (!silent) addToast('Failed to refresh', 'error');
    }
    if (!silent) setIsRefreshing(false);
  }, [mailbox, addToast]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (!mailbox) return;
    handleRefresh(true);
    refreshRef.current = setInterval(() => handleRefresh(true), 10000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [mailbox?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check existing email (public)
  const handleCheckEmail = useCallback((emailAddr?: string) => {
    const addr = emailAddr || checkEmail.trim();
    if (!addr) return;
    
    // Add domain if not present
    let fullAddr = addr;
    if (!addr.includes('@')) {
      fullAddr = `${addr}@${domain}`;
    }

    setIsLoading(true);
    setSelectedMessage(null);

    // Create a temporary mailbox entry for this address
    const result = createCustomMailbox(fullAddr.split('@')[0]);
    if (result.success && result.mailbox) {
      setMailbox(result.mailbox);
      setSavedMailboxes(getAllMailboxes());
      setCheckEmail('');
    } else {
      // If already exists, find it
      const existing = getAllMailboxes().find(m => m.email === fullAddr);
      if (existing) {
        setMailbox(existing);
        setCheckEmail('');
      }
    }

    setTimeout(async () => {
      const mb = getAllMailboxes().find(m => m.email === fullAddr);
      if (mb) {
        const msgs = await refreshInbox(mb.id);
        setMessages(msgs);
        setUnreadCount(getUnreadCount(mb.id));
      }
      setIsLoading(false);
    }, 200);
  }, [checkEmail, domain]);



  // Generate random
  const handleGenerateRandom = useCallback(() => {
    setIsLoading(true);
    setSelectedMessage(null);
    setTimeout(async () => {
      const result = createMailbox();
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        setSavedMailboxes(getAllMailboxes());
        addToast(`Created: ${result.mailbox.email}`, 'success');
        const msgs = await refreshInbox(result.mailbox.id);
        setMessages(msgs);
        setUnreadCount(getUnreadCount(result.mailbox.id));
      }
      setIsLoading(false);
    }, 300);
  }, [addToast]);

  // Generate custom
  const handleGenerateCustom = useCallback(() => {
    if (!customPrefix.trim()) { setCustomError('Enter a prefix'); return; }
    setCustomError(null);
    setIsLoading(true);
    setSelectedMessage(null);
    setTimeout(async () => {
      const result = createCustomMailbox(customPrefix.trim());
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        setSavedMailboxes(getAllMailboxes());
        setCustomPrefix('');
        addToast(`Created: ${result.mailbox.email}`, 'success');
        const msgs = await refreshInbox(result.mailbox.id);
        setMessages(msgs);
        setUnreadCount(getUnreadCount(result.mailbox.id));
      } else {
        setCustomError(result.error || 'Failed');
      }
      setIsLoading(false);
    }, 300);
  }, [customPrefix, addToast]);

  const handleSelectMailbox = useCallback((mb: TempMailbox) => {
    setMailbox(mb);
    setSelectedMessage(null);
    setMessages(getInbox(mb.id));
  }, []);

  const handleCopy = useCallback(() => {
    if (mailbox) {
      navigator.clipboard.writeText(mailbox.email).then(() => addToast('Copied!', 'success')).catch(() => {});
    }
  }, [mailbox, addToast]);

  const handleDeleteMailbox = useCallback(() => {
    if (mailbox) {
      deleteMailbox(mailbox.id);
      setSavedMailboxes(getAllMailboxes());
      const remaining = getAllMailboxes();
      setMailbox(remaining.length > 0 ? remaining[0] : null);
      setMessages([]); setSelectedMessage(null);
      addToast('Inbox removed', 'info');
    }
  }, [mailbox, addToast]);

  const handleClearMessages = useCallback(async () => {
    if (!mailbox) return;
    const count = await clearMailboxMessages(mailbox.id);
    setMessages([]); setUnreadCount(0); setSelectedMessage(null);
    addToast(`Cleared ${count} message(s)`, 'info');
  }, [mailbox, addToast]);

  const handleDeleteMessage = useCallback(async (msg: TempMessage) => {
    if (msg.uid && mailbox) {
      const ok = await deleteMessage(msg.uid, mailbox.id);
      if (ok) {
        setMessages(getInbox(mailbox.id));
        setUnreadCount(getUnreadCount(mailbox.id));
        if (selectedMessage?.uid === msg.uid) setSelectedMessage(null);
        addToast('Deleted', 'info');
      }
    }
  }, [mailbox, selectedMessage, addToast]);

  const handleSelectMessage = useCallback(async (msg: TempMessage) => {
    if (msg.uid && mailbox) {
      setIsRefreshing(true);
      const full = await getFullMessage(msg.uid, mailbox.id);
      setSelectedMessage(full || msg);
      setMessages(getInbox(mailbox.id));
      setUnreadCount(getUnreadCount(mailbox.id));
      setIsRefreshing(false);
    }
  }, [mailbox]);

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8 pt-20">
        <div className="w-full max-w-2xl">
          <TempMailHeader />

          {/* ── Check Inbox (Public) ───────────────── */}
          <div className="glass-card p-5 sm:p-6 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <h2 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Check Your Inbox</h2>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={checkEmail}
                  onChange={e => setCheckEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCheckEmail()}
                  placeholder={`username@${domain}`}
                  className="input-field !py-3 text-sm"
                />
              </div>
              <button onClick={() => handleCheckEmail()} disabled={isLoading} className="btn-primary !px-5 !py-3 flex-shrink-0">
                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Check'}
              </button>
            </div>
            <p className="text-[10px] text-white/15 mt-2">Enter your email address to check for messages</p>
          </div>

          {/* ── Create New Email ────────────────────── */}
          <div className="glass-card p-5 sm:p-6 mb-4 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
            <h2 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">Create New Email</h2>
            
            {/* Mode toggle */}
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setCreateMode('random')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  createMode === 'random' ? 'bg-violet-500/15 text-violet-300 border-violet-500/25' : 'bg-white/[0.02] text-white/30 border-white/[0.06] hover:text-white/50'
                }`}>
                🎲 Random
              </button>
              <button onClick={() => setCreateMode('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  createMode === 'custom' ? 'bg-violet-500/15 text-violet-300 border-violet-500/25' : 'bg-white/[0.02] text-white/30 border-white/[0.06] hover:text-white/50'
                }`}>
                ✏️ Custom
              </button>
            </div>

            {createMode === 'random' ? (
              <button onClick={handleGenerateRandom} disabled={isLoading} className="btn-primary w-full !py-3">
                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Generate Random Email</>
                )}
              </button>
            ) : (
              <div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input type="text" value={customPrefix} onChange={e => { setCustomPrefix(e.target.value); setCustomError(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleGenerateCustom()} placeholder="your-name"
                      className="input-field !py-3 text-sm !pr-40" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/15 text-xs font-mono pointer-events-none">@{domain}</span>
                  </div>
                  <button onClick={handleGenerateCustom} disabled={isLoading} className="btn-primary !px-5 !py-3 flex-shrink-0">
                    {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create'}
                  </button>
                </div>
                {customError && <p className="text-red-400/70 text-xs mt-2">{customError}</p>}
              </div>
            )}
          </div>

          {/* ── Saved Inboxes ────────────────────────── */}
          {savedMailboxes.length > 0 && (
            <div className="glass-card p-4 sm:p-5 mb-4 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
              <h2 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
                Your Inboxes ({savedMailboxes.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {savedMailboxes.map(mb => (
                  <button key={mb.id} onClick={() => handleSelectMailbox(mb)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all border ${
                      mailbox?.id === mb.id
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                        : 'bg-white/[0.02] text-white/25 border-white/[0.05] hover:text-white/40'
                    }`}>
                    {mb.email.split('@')[0]}@…
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Active Mailbox ───────────────────────── */}
          {mailbox && (
            <div className="space-y-4">
              <MailboxCard
                mailbox={mailbox} unreadCount={unreadCount} onCopy={handleCopy}
                onRefresh={() => handleRefresh(false)} onDelete={handleDeleteMailbox}
                onClearMessages={handleClearMessages} onRegenerate={handleGenerateRandom}
              />

              <div className="glass-card p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {selectedMessage ? 'Message' : 'Inbox'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isRefreshing && <div className="w-3 h-3 border border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />}
                    {!selectedMessage && messages.length > 0 && (
                      <span className="text-[10px] text-white/20">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {selectedMessage ? (
                  <div>
                    <MessageView message={selectedMessage} onBack={() => setSelectedMessage(null)} />
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <button onClick={() => handleDeleteMessage(selectedMessage)} className="btn-danger !py-2 !px-4 !text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <InboxList messages={messages} selectedId={null} onSelect={handleSelectMessage} />
                )}
              </div>
            </div>
          )}

          <Footer />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default TempMailPage;

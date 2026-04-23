/**
 * Service Hub - Receive Code Page
 *
 * A simple, clean page for clients to:
 *   - Enter their email address
 *   - View received verification codes & messages
 *   - Direct link: /receive-code/email@domain
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InboxList from '../components/tempmail/InboxList';
import MessageView from '../components/tempmail/MessageView';
import Footer from '../components/Footer';
import CyberBackground from '../components/CyberBackground';
import Toast from '../components/Toast';
import type { ToastData } from '../components/Toast';
import type { TempMessage } from '../services/tempmail-service';
import {
  createCustomMailbox,
  getAllMailboxes,
  refreshInbox,
  getInbox,
  getFullMessage,
  getUnreadCount,
  deleteMessage,
} from '../services/tempmail-service';
import { getPrimaryDomain, getActiveDomains } from '../services/domain-config';
import { playNotificationSound, updateTabBadge } from '../utils/email-utils';

function ReceiveCodePage() {
  const { address: urlAddress } = useParams<{ address?: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TempMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<TempMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [countdown, setCountdown] = useState(5);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMsgCountRef = useRef(0);

  const domain = getPrimaryDomain();
  const activeDomains = getActiveDomains().map(d => d.domain);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load inbox for an email address
  const loadInbox = useCallback(async (addr: string) => {
    let fullAddr = addr.trim();
    if (!fullAddr) return;
    setEmailError(null);

    // Validate: must contain @
    if (!fullAddr.includes('@')) {
      setEmailError(`Please enter the full email address (e.g. name@${domain})`);
      return;
    }

    // Validate: domain must be in active domains
    const emailDomain = fullAddr.split('@')[1];
    if (!activeDomains.includes(emailDomain)) {
      setEmailError(`Invalid domain "${emailDomain}". Valid domains: ${activeDomains.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setActiveEmail(fullAddr);
    setSelectedMessage(null);
    setEmail('');

    // Update URL
    navigate(`/receive-code/${encodeURIComponent(fullAddr)}`, { replace: true });

    // Find or create mailbox
    let mb = getAllMailboxes().find(m => m.email === fullAddr);
    if (!mb) {
      const result = createCustomMailbox(fullAddr.split('@')[0]);
      if (result.success && result.mailbox) mb = result.mailbox;
    }

    if (mb) {
      setMailboxId(mb.id);
      const msgs = await refreshInbox(mb.id);
      setMessages(msgs);
      setUnreadCount(getUnreadCount(mb.id));
    }
    setIsLoading(false);
  }, [domain, activeDomains, navigate]);

  // Handle URL address on mount
  useEffect(() => {
    if (urlAddress) {
      loadInbox(decodeURIComponent(urlAddress));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 5 seconds with countdown
  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!mailboxId) return;

    setCountdown(5);

    const doRefresh = async () => {
      try {
        const msgs = await refreshInbox(mailboxId);
        // Sound notification if new messages
        if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
          playNotificationSound();
        }
        prevMsgCountRef.current = msgs.length;
        setMessages(msgs);
        const unread = getUnreadCount(mailboxId);
        setUnreadCount(unread);
        updateTabBadge(unread);
      } catch { /* silent */ }
      setCountdown(5);
    };

    refreshRef.current = setInterval(doRefresh, 5000);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 5 : prev - 1));
    }, 1000);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [mailboxId]);

  // Handle visibility change and window focus to fetch immediately
  useEffect(() => {
    if (!mailboxId) return;

    const handleFocusOrVisible = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const msgs = await refreshInbox(mailboxId);
          if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
            playNotificationSound();
          }
          prevMsgCountRef.current = msgs.length;
          setMessages(msgs);
          const unread = getUnreadCount(mailboxId);
          setUnreadCount(unread);
          updateTabBadge(unread);
          setCountdown(5);
        } catch { /* silent */ }
      }
    };

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    return () => {
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [mailboxId]);

  // Copy and Paste Handlers
  const handleCopy = useCallback(async () => {
    const textToCopy = activeEmail || email;
    if (!textToCopy) {
      addToast('Nothing to copy', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      addToast('Copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  }, [activeEmail, email, addToast]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setEmail(text);
        setEmailError(null);
      }
    } catch {
      addToast('Paste failed — please allow clipboard access', 'error');
    }
  }, [addToast]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    if (!mailboxId) return;
    setIsRefreshing(true);
    try {
      const msgs = await refreshInbox(mailboxId);
      setMessages(msgs);
      setUnreadCount(getUnreadCount(mailboxId));
    } catch {
      addToast('Failed to refresh', 'error');
    }
    setIsRefreshing(false);
  }, [mailboxId, addToast]);

  // View full message
  const handleSelectMessage = useCallback(async (msg: TempMessage) => {
    if (msg.uid && mailboxId) {
      setIsRefreshing(true);
      const full = await getFullMessage(msg.uid, mailboxId);
      setSelectedMessage(full || msg);
      setMessages(getInbox(mailboxId));
      setUnreadCount(getUnreadCount(mailboxId));
      setIsRefreshing(false);
    }
  }, [mailboxId]);

  // Delete message
  const handleDeleteMessage = useCallback(async (msg: TempMessage) => {
    if (msg.uid && mailboxId) {
      const ok = await deleteMessage(msg.uid, mailboxId);
      if (ok) {
        setMessages(getInbox(mailboxId));
        setUnreadCount(getUnreadCount(mailboxId));
        if (selectedMessage?.uid === msg.uid) setSelectedMessage(null);
        addToast('Message deleted', 'info');
      }
    }
  }, [mailboxId, selectedMessage, addToast]);

  return (
    <div className="min-h-screen relative">
      {/* Deep space background */}
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
      <CyberBackground variant="inbox" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8 pt-24">
        <div className="w-full max-w-xl">

          {/* ── Header ─────────────────────────────────── */}
          <div className="text-center mb-8 animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="relative inline-flex items-center justify-center mb-5">
              <div className="absolute w-20 h-20 rounded-3xl bg-cyan-500/15 blur-2xl animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Receive Code</span>
            </h1>
            <p className="text-white/20 text-xs sm:text-sm font-light tracking-wide">
              Enter your email to view verification codes
            </p>
          </div>

          {/* ── Email Input ────────────────────────────── */}
          <div className="glass-card p-5 sm:p-6 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/15">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(null); }}
                  onKeyDown={e => e.key === 'Enter' && loadInbox(email)}
                  placeholder={`your-email@${domain}`}
                  className="input-field !py-3.5 text-sm !pl-11"
                  autoFocus
                />
              </div>
              <button
                onClick={() => loadInbox(email)}
                disabled={isLoading || !email.trim()}
                className="btn-primary-cyan !px-6 !py-3.5 flex-shrink-0"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Check
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={handlePaste} className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Paste
              </button>
              <button onClick={handleCopy} className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy
              </button>
            </div>

            {emailError && (
              <p className="text-red-400/80 text-xs mt-2 flex items-center gap-1.5 animate-fade-in">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {emailError}
              </p>
            )}
          </div>

          {/* ── Active Inbox ───────────────────────────── */}
          {activeEmail && mailboxId && (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
              {/* Current email */}
              <div className="glass-card p-4 sm:p-5 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow shadow-emerald-400/30" />
                    <span className="text-sm font-mono text-cyan-300/80 truncate">{activeEmail}</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/12 border border-cyan-500/15 text-[9px] text-cyan-300 font-bold">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/8 border border-cyan-500/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[10px] text-cyan-300/70 tabular-nums font-mono font-medium">{countdown}s</span>
                    </div>
                    <button onClick={handleRefresh} className="p-2 rounded-lg text-white/20 hover:text-cyan-300/60 hover:bg-cyan-500/[0.08] transition-all" title="Refresh">
                      <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="glass-card p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                    {selectedMessage ? 'Message' : 'Messages'}
                  </h2>
                  {!selectedMessage && messages.length > 0 && (
                    <span className="text-[10px] text-white/15 tabular-nums">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {selectedMessage ? (
                  <div>
                    <MessageView message={selectedMessage} onBack={() => setSelectedMessage(null)} />
                    <div className="mt-4 pt-4 border-t border-white/[0.05]">
                      <button onClick={() => handleDeleteMessage(selectedMessage)} className="btn-danger !py-2 !px-4 !text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <InboxList messages={messages} selectedId={null} onSelect={handleSelectMessage} />
                )}
              </div>
            </div>
          )}

          <Footer
            brand="Service Hub — Inbox"
            tagline="Quick access to verification codes · OTP messages · email notifications"
          />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default ReceiveCodePage;

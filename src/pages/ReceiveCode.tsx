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
import { getActiveDomains, getPrimaryDomain } from '../services/domain-config';
import { playNotificationSound, updateTabBadge } from '../utils/email-utils';

const SAVED_PREFIX_KEY = 'servicehub_quick_prefix';

function ReceiveCodePage() {
  const { address: urlAddress } = useParams<{ address?: string }>();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [savedPrefix, setSavedPrefix] = useState(() => {
    try { return localStorage.getItem(SAVED_PREFIX_KEY) || ''; } catch { return ''; }
  });
  const [selectedDomain, setSelectedDomain] = useState('');
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
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMsgCountRef = useRef(0);

  const activeDomains = getActiveDomains().map(d => d.domain);

  // Initialize selectedDomain with primary domain (gpt-servicehub.cloud)
  useEffect(() => {
    if (!selectedDomain && activeDomains.length > 0) {
      const primary = getPrimaryDomain();
      setSelectedDomain(activeDomains.includes(primary) ? primary : activeDomains[0]);
    }
  }, [activeDomains, selectedDomain]);

  // Construct full email from username + selectedDomain
  const fullEmail = username.trim() ? `${username.trim()}@${selectedDomain}` : '';

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load inbox for an email address
  const loadInbox = useCallback(async (addr: string) => {
    let fullAddr = addr.trim().toLowerCase();
    if (!fullAddr) return;
    setEmailError(null);

    // If the address doesn't contain @, construct it from username + selectedDomain
    if (!fullAddr.includes('@')) {
      if (!selectedDomain) {
        setEmailError('Please select a domain');
        return;
      }
      fullAddr = `${fullAddr}@${selectedDomain}`;
    }

    // Validate: domain must be in active domains
    const emailDomain = fullAddr.split('@')[1];
    if (!activeDomains.includes(emailDomain)) {
      setEmailError(`Invalid domain "${emailDomain}". Valid domains: ${activeDomains.join(', ')}`);
      return;
    }

    // Validate username part
    const userPart = fullAddr.split('@')[0];
    if (!userPart || userPart.length < 2) {
      setEmailError('Username must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setActiveEmail(fullAddr);
    setSelectedMessage(null);
    setUsername('');

    // Update URL
    navigate(`/receive-code/${encodeURIComponent(fullAddr)}`, { replace: true });

    // Find or create mailbox (case-insensitive lookup)
    let mb = getAllMailboxes().find(m => m.email.toLowerCase() === fullAddr);
    if (!mb) {
      const result = createCustomMailbox(fullAddr.split('@')[0], fullAddr.split('@')[1]);
      if (result.success && result.mailbox) mb = result.mailbox;
    }

    if (mb) {
      setMailboxId(mb.id);
      const msgs = await refreshInbox(mb.id);
      setMessages(msgs);
      setUnreadCount(getUnreadCount(mb.id));
    }
    setIsLoading(false);
  }, [selectedDomain, activeDomains, navigate]);

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

  // Parse a pasted/typed full email into username + domain
  const parseAndSetEmail = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.includes('@')) {
      const [user, dom] = trimmed.split('@');
      setUsername(user);
      if (dom && activeDomains.includes(dom.toLowerCase())) {
        setSelectedDomain(dom.toLowerCase());
      }
    } else {
      setUsername(trimmed);
    }
    setEmailError(null);
  }, [activeDomains]);

  // Copy and Paste Handlers
  const handleCopy = useCallback(async () => {
    const textToCopy = activeEmail || fullEmail;
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
  }, [activeEmail, fullEmail, addToast]);

  const handlePaste = useCallback(async () => {
    // Try Clipboard API first
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        parseAndSetEmail(text);
        addToast('Email pasted', 'success');
        return;
      }
    } catch {
      // Clipboard API blocked → open paste modal
    }
    setPasteInput('');
    setShowPasteModal(true);
    setTimeout(() => pasteInputRef.current?.focus(), 100);
  }, [addToast, parseAndSetEmail]);

  const handleConfirmPaste = useCallback(() => {
    if (pasteInput.trim()) {
      parseAndSetEmail(pasteInput);
      addToast('Email pasted', 'success');
    }
    setShowPasteModal(false);
    setPasteInput('');
  }, [pasteInput, addToast, parseAndSetEmail]);

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

  // Share direct link
  const handleShare = useCallback(async () => {
    if (!activeEmail) return;
    const url = `${window.location.origin}/receive-code/${encodeURIComponent(activeEmail)}`;
    // Try native share (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Service Hub Inbox', url });
        return;
      } catch { /* user cancelled or not supported */ }
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy link', 'error');
    }
  }, [activeEmail, addToast]);

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
            {/* Username + @ + Domain Dropdown + Check */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-stretch rounded-2xl bg-white/[0.03] border border-white/[0.08] focus-within:border-cyan-500/30 focus-within:bg-white/[0.05] transition-all overflow-hidden">
                {/* Username input (also accepts full email) */}
                <div className="relative flex-1 min-w-0">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={e => {
                      const val = e.target.value.replace(/\s/g, '');
                      // If user types or pastes a full email, auto-split into username + domain
                      if (val.includes('@')) {
                        const [user, dom] = val.split('@');
                        setUsername(user);
                        if (dom && activeDomains.includes(dom.toLowerCase())) {
                          setSelectedDomain(dom.toLowerCase());
                        }
                      } else {
                        setUsername(val);
                      }
                      setEmailError(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && loadInbox(username)}
                    placeholder="username or full email"
                    className="w-full bg-transparent text-sm text-white/90 placeholder-white/20 py-3.5 pl-10 pr-2 outline-none font-mono"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {/* @ separator */}
                <div className="flex items-center px-1">
                  <span className="text-white/20 text-sm font-mono font-bold select-none">@</span>
                </div>

                {/* Domain selector */}
                <div className="relative flex items-center">
                  <select
                    value={selectedDomain}
                    onChange={e => setSelectedDomain(e.target.value)}
                    className="appearance-none bg-transparent text-xs text-cyan-300/80 font-mono py-3.5 pl-2 pr-7 outline-none cursor-pointer hover:text-cyan-300 transition-colors"
                  >
                    {activeDomains.map(d => (
                      <option key={d} value={d} className="bg-[#0a0f1a] text-white">{d}</option>
                    ))}
                  </select>
                  <svg className="absolute right-2 w-3 h-3 text-white/20 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Check button */}
              <button
                onClick={() => loadInbox(username)}
                disabled={isLoading || !username.trim()}
                className="btn-primary-cyan !px-5 !py-3.5 flex-shrink-0"
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

            {/* Preview: show the full email being constructed */}
            {username.trim() && (
              <div className="mt-2.5 flex items-center gap-2 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse" />
                <span className="text-[11px] font-mono text-white/25 truncate">
                  {fullEmail}
                </span>
              </div>
            )}

            {/* ── Fixed Prefix for Quick Random ──── */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 flex items-stretch rounded-xl bg-white/[0.02] border border-white/[0.06] focus-within:border-cyan-500/25 transition-all overflow-hidden">
                <div className="flex items-center pl-3 pr-1.5 gap-1.5 border-r border-white/[0.06]">
                  <svg className="w-3 h-3 text-cyan-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[9px] text-cyan-400/40 font-semibold uppercase tracking-wider whitespace-nowrap select-none">Prefix</span>
                </div>
                <input
                  type="text"
                  value={savedPrefix}
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase().slice(0, 20);
                    setSavedPrefix(val);
                    try { localStorage.setItem(SAVED_PREFIX_KEY, val); } catch {}
                  }}
                  placeholder="e.g. ahmed"
                  className="flex-1 bg-transparent text-xs text-cyan-200/80 placeholder-white/15 py-2.5 px-3 outline-none font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                {savedPrefix && (
                  <div className="flex items-center pr-2 animate-fade-in">
                    <span className="text-[10px] text-white/15 font-mono">.xxxxx</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Action Buttons ──── */}
            <div className="flex gap-2 mt-3">
              {/* Quick Random Email */}
              <button
                onClick={() => {
                  const base = savedPrefix.trim().replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
                  if (!base) {
                    setEmailError('اكتب البريفكس (البداية) في خانة Prefix وبعدين اضغط Quick Random');
                    return;
                  }
                  const alphaNum = 'abcdefghijklmnopqrstuvwxyz0123456789';
                  const suffix = Array.from({ length: 5 }, () => alphaNum[Math.floor(Math.random() * alphaNum.length)]).join('');
                  const prefix = `${base}.${suffix}`;
                  const domain = selectedDomain || getPrimaryDomain();
                  setUsername(prefix);
                  setSelectedDomain(domain);
                  setEmailError(null);
                  loadInbox(`${prefix}@${domain}`);
                }}
                disabled={isLoading}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-300/70 active:bg-cyan-500/25 active:text-cyan-200 hover:from-cyan-500/15 hover:to-blue-500/15 hover:text-cyan-300 hover:border-cyan-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation disabled:opacity-40"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Random
              </button>
              <button onClick={handlePaste} className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 active:bg-white/15 active:text-white hover:bg-white/[0.06] hover:text-white/60 text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Paste
              </button>
              <button onClick={handleCopy} className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 active:bg-white/15 active:text-white hover:bg-white/[0.06] hover:text-white/60 text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy
              </button>
            </div>

            {/* ── Copy Direct Link Button ──── */}
            {activeEmail && (
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/receive-code/${encodeURIComponent(activeEmail)}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    addToast('تم نسخ لينك الدخول المباشر ✓', 'success');
                  } catch {
                    addToast('فشل نسخ الرابط', 'error');
                  }
                }}
                className="w-full mt-2 min-h-[40px] py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/8 to-teal-500/8 border border-emerald-500/15 text-emerald-300/70 active:bg-emerald-500/20 active:text-emerald-200 hover:from-emerald-500/12 hover:to-teal-500/12 hover:text-emerald-300 hover:border-emerald-500/25 text-xs font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation animate-fade-in"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                نسخ لينك الدخول المباشر
              </button>
            )}

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
                    <button onClick={handleShare} className="p-2 rounded-lg text-white/20 hover:text-cyan-300/60 hover:bg-cyan-500/[0.08] transition-all" title="Share link">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
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

      {/* ── PASTE MODAL (Mobile Fallback) ──────────── */}
      {showPasteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={() => setShowPasteModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative w-full max-w-sm glass-card p-6 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Paste Email</h3>
                  <p className="text-[10px] text-white/30">Long-press below → Paste</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-2 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/5 transition-all touch-manipulation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              ref={pasteInputRef}
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Long-press here and tap Paste…"
              rows={2}
              className="input-field !text-sm resize-none touch-manipulation"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] active:bg-white/[0.08] transition-all touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPaste}
                disabled={!pasteInput.trim()}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default ReceiveCodePage;

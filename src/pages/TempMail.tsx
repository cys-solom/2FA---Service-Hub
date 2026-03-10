/**
 * Service Hub - Temp Mail Page
 *
 * Connects to Mailcow IMAP via serverless API to fetch real emails.
 * Generates random addresses on the configured domain (catch-all).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import TempMailHeader from '../components/tempmail/TempMailHeader';
import EmailGenerator from '../components/tempmail/EmailGenerator';
import MailboxCard from '../components/tempmail/MailboxCard';
import InboxList from '../components/tempmail/InboxList';
import MessageView from '../components/tempmail/MessageView';
import SecurityNotice from '../components/SecurityNotice';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import type { ToastData } from '../components/Toast';
import type { TempMailbox, TempMessage, ExpiryOption } from '../services/tempmail-service';
import {
  createMailbox,
  getMailbox,
  refreshInbox,
  getInbox,
  getFullMessage,
  getUnreadCount,
  deleteMailbox,
} from '../services/tempmail-service';

function TempMailPage() {
  const [mailbox, setMailbox] = useState<TempMailbox | null>(null);
  const [messages, setMessages] = useState<TempMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<TempMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Refresh inbox from IMAP
  const handleRefresh = useCallback(async (silent = false) => {
    if (!mailbox) return;
    const mb = getMailbox(mailbox.id);
    if (!mb || mb.status === 'expired') {
      setMailbox(null);
      setMessages([]);
      setSelectedMessage(null);
      if (!silent) addToast('Mailbox expired', 'info');
      return;
    }

    if (!silent) setIsRefreshing(true);
    try {
      const freshMessages = await refreshInbox(mb.id);
      setMessages(freshMessages);
      setUnreadCount(getUnreadCount(mb.id));
      if (!silent && freshMessages.length > 0) {
        addToast(`${freshMessages.length} message(s) found`, 'success');
      }
    } catch (err) {
      if (!silent) addToast('Failed to refresh inbox', 'error');
    }
    if (!silent) setIsRefreshing(false);
  }, [mailbox, addToast]);

  // Generate new mailbox
  const handleGenerate = useCallback(async (expiry: ExpiryOption) => {
    setIsLoading(true);
    setError(null);
    setSelectedMessage(null);

    if (mailbox) deleteMailbox(mailbox.id);

    setTimeout(async () => {
      const result = createMailbox(expiry);
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        addToast(`Inbox created: ${result.mailbox.email}`, 'success');
        // Do initial refresh
        const msgs = await refreshInbox(result.mailbox.id);
        setMessages(msgs);
        setUnreadCount(getUnreadCount(result.mailbox.id));
      } else {
        setError(result.error || 'Failed to create mailbox');
      }
      setIsLoading(false);
    }, 400);
  }, [mailbox, addToast]);

  // Copy email
  const handleCopy = useCallback(() => {
    if (mailbox) {
      navigator.clipboard.writeText(mailbox.email).then(() => {
        addToast('Email address copied!', 'success');
      }).catch(() => {
        addToast('Failed to copy', 'error');
      });
    }
  }, [mailbox, addToast]);

  // Delete mailbox
  const handleDelete = useCallback(() => {
    if (mailbox) {
      deleteMailbox(mailbox.id);
      setMailbox(null);
      setMessages([]);
      setSelectedMessage(null);
      addToast('Inbox deleted', 'info');
    }
  }, [mailbox, addToast]);

  // Select message — fetch full content from IMAP
  const handleSelectMessage = useCallback(async (msg: TempMessage) => {
    if (msg.uid && mailbox) {
      setIsRefreshing(true);
      const full = await getFullMessage(msg.uid, mailbox.id);
      if (full) {
        setSelectedMessage(full);
        setMessages(getInbox(mailbox.id));
        setUnreadCount(getUnreadCount(mailbox.id));
      } else {
        // Fallback: show what we have
        setSelectedMessage(msg);
      }
      setIsRefreshing(false);
    } else {
      setSelectedMessage(msg);
    }
  }, [mailbox]);

  // Expiry timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!mailbox) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((mailbox.expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        setMailbox(null);
        setMessages([]);
        setSelectedMessage(null);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mailbox?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh inbox every 10 seconds
  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current);
    if (!mailbox) return;

    refreshRef.current = setInterval(() => {
      handleRefresh(true); // silent refresh
    }, 10000);

    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [mailbox?.id, handleRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8 pt-20">
        <div className="w-full max-w-2xl">
          <TempMailHeader />

          {/* Generator (when no mailbox) */}
          {!mailbox && (
            <EmailGenerator
              onGenerate={handleGenerate}
              isLoading={isLoading}
              error={error}
            />
          )}

          {/* Active mailbox */}
          {mailbox && (
            <div className="space-y-4">
              <MailboxCard
                mailbox={mailbox}
                timeRemaining={timeRemaining}
                unreadCount={unreadCount}
                onCopy={handleCopy}
                onRefresh={() => handleRefresh(false)}
                onDelete={handleDelete}
                onRegenerate={() => handleGenerate(30)}
              />

              {/* Inbox / Message view */}
              <div className="glass-card p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {selectedMessage ? 'Message' : 'Inbox'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isRefreshing && (
                      <div className="w-3 h-3 border border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    )}
                    {!selectedMessage && messages.length > 0 && (
                      <span className="text-[10px] text-white/20 tabular-nums">
                        {messages.length} message{messages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {selectedMessage ? (
                  <MessageView
                    message={selectedMessage}
                    onBack={() => setSelectedMessage(null)}
                  />
                ) : (
                  <InboxList
                    messages={messages}
                    selectedId={null}
                    onSelect={handleSelectMessage}
                  />
                )}
              </div>
            </div>
          )}

          <SecurityNotice />
          <Footer />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default TempMailPage;

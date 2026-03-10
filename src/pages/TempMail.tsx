/**
 * Service Hub - Temp Mail Page
 *
 * A complete temporary email inbox with generate, view, copy, and delete.
 * Uses in-memory demo service; swap for real API in production.
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
  getInbox,
  getMessage,
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
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Refresh inbox data
  const refreshInbox = useCallback(() => {
    if (!mailbox) return;
    const mb = getMailbox(mailbox.id);
    if (!mb || mb.status === 'expired') {
      setMailbox(null);
      setMessages([]);
      setSelectedMessage(null);
      addToast('Mailbox expired', 'info');
      return;
    }
    setMailbox(mb);
    setMessages(getInbox(mb.id));
    setUnreadCount(getUnreadCount(mb.id));
  }, [mailbox, addToast]);

  // Generate new mailbox
  const handleGenerate = useCallback((expiry: ExpiryOption) => {
    setIsLoading(true);
    setError(null);
    setSelectedMessage(null);

    // Delete current mailbox if exists
    if (mailbox) {
      deleteMailbox(mailbox.id);
    }

    // Small delay for UX
    setTimeout(() => {
      const result = createMailbox(expiry);
      setIsLoading(false);
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        setMessages(getInbox(result.mailbox.id));
        setUnreadCount(getUnreadCount(result.mailbox.id));
        addToast('Temporary inbox created!', 'success');
      } else {
        setError(result.error || 'Failed to create mailbox');
      }
    }, 600);
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

  // Select message
  const handleSelectMessage = useCallback((msg: TempMessage) => {
    const full = getMessage(msg.id);
    if (full) {
      setSelectedMessage(full);
      // Update messages to reflect read status
      if (mailbox) {
        setMessages(getInbox(mailbox.id));
        setUnreadCount(getUnreadCount(mailbox.id));
      }
    }
  }, [mailbox]);

  // Timer & auto-refresh
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
        return;
      }

      // Auto-refresh inbox every 5 seconds
      refreshInbox();
    };

    tick();
    intervalRef.current = setInterval(tick, 5000);

    // Also tick the timer every second
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(timerInterval);
    };
  }, [mailbox?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <main className="relative z-10 flex items-start justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl">
          <TempMailHeader />

          {/* Generator (always visible when no mailbox) */}
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
                onRefresh={refreshInbox}
                onDelete={handleDelete}
                onRegenerate={() => handleGenerate(30)}
              />

              {/* Inbox / Message view */}
              <div className="glass-card p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {selectedMessage ? 'Message' : 'Inbox'}
                  </h2>
                  {!selectedMessage && messages.length > 0 && (
                    <span className="text-[10px] text-white/20 tabular-nums">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                  )}
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

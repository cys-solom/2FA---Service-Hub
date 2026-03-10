import React, { useState } from 'react';
import type { TempMailbox } from '../../services/tempmail-service';

interface MailboxCardProps {
  mailbox: TempMailbox;
  unreadCount: number;
  onCopy: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onClearMessages: () => void;
  onRegenerate: () => void;
}

const MailboxCard: React.FC<MailboxCardProps> = ({
  mailbox,
  unreadCount,
  onCopy,
  onRefresh,
  onDelete,
  onClearMessages,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-5 sm:p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
      {/* Email address */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow shadow-emerald-400/30" />
          <span className="text-[10px] text-emerald-400/60 font-semibold uppercase tracking-wider">Active Inbox</span>
          {unreadCount > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-violet-500/12 border border-violet-500/15 ml-auto">
              <span className="text-[9px] text-violet-300 font-bold tabular-nums">{unreadCount} new</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 font-mono text-sm text-violet-300/90 tracking-wide truncate select-all">
            {mailbox.email}
          </div>
          <button
            onClick={handleCopy}
            className={`group relative p-3 rounded-xl border transition-all duration-200 flex-shrink-0 ${
              copied
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-violet-500/8 border-violet-500/15 text-violet-400 hover:bg-violet-500/15 hover:border-violet-500/25'
            }`}
            title="Copy email"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1">
          <ActionBtn onClick={onRefresh} title="Refresh inbox" color="default">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </ActionBtn>
          <ActionBtn onClick={onClearMessages} title="Clear all messages" color="yellow">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </ActionBtn>
        </div>

        <ActionBtn onClick={onDelete} title="Remove inbox" color="red">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </ActionBtn>
      </div>
    </div>
  );
};

function ActionBtn({ children, onClick, title, color }: {
  children: React.ReactNode; onClick: () => void; title: string;
  color: 'default' | 'yellow' | 'red';
}) {
  const colors = {
    default: 'text-white/20 hover:text-white/50 hover:bg-white/[0.05]',
    yellow: 'text-white/20 hover:text-amber-400/60 hover:bg-amber-500/[0.06]',
    red: 'text-white/20 hover:text-red-400/60 hover:bg-red-500/[0.06]',
  };
  return (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-lg transition-all duration-200 ${colors[color]}`}>
      {children}
    </button>
  );
}

export default MailboxCard;

import React from 'react';
import type { TempMailbox } from '../../services/tempmail-service';

interface MailboxCardProps {
  mailbox: TempMailbox;
  unreadCount: number;
  onCopy: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
}

const MailboxCard: React.FC<MailboxCardProps> = ({
  mailbox,
  unreadCount,
  onCopy,
  onRefresh,
  onDelete,
  onRegenerate,
}) => {
  return (
    <div className="glass-card p-5 sm:p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
      {/* Email address display */}
      <div>
        <label className="block text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">
          Your Temporary Email
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-sm text-violet-300 tracking-wide truncate select-all">
            {mailbox.email}
          </div>
          <button
            onClick={onCopy}
            className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-200 flex-shrink-0"
            title="Copy email address"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Active status */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400/70 font-medium">Active</span>
          </div>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/20">
              <span className="text-[10px] text-violet-300 font-semibold">{unreadCount} new</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button onClick={onRefresh} className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all" title="Refresh inbox">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={onRegenerate} className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all" title="New email">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg text-white/25 hover:text-red-400/60 hover:bg-red-500/[0.06] transition-all" title="Delete inbox">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MailboxCard;

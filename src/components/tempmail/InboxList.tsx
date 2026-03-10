import React from 'react';
import type { TempMessage } from '../../services/tempmail-service';

interface InboxListProps {
  messages: TempMessage[];
  selectedId: string | null;
  onSelect: (msg: TempMessage) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function senderName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  if (match) return match[1].replace(/"/g, '').trim();
  return from.split('@')[0];
}

function senderInitial(from: string): string {
  const name = senderName(from);
  return name.charAt(0).toUpperCase();
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
];

function getAvatarColor(from: string): string {
  let hash = 0;
  for (let i = 0; i < from.length; i++) hash = from.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const InboxList: React.FC<InboxListProps> = ({ messages, selectedId, onSelect }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-14">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute w-16 h-16 rounded-2xl bg-violet-500/10 blur-xl" />
          <div className="relative w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <svg className="w-6 h-6 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className="text-white/20 text-xs font-medium mb-1">Waiting for emails…</p>
        <p className="text-white/10 text-[10px]">Messages will appear here automatically</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
      {messages.map((msg, i) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg)}
          className={`msg-item w-full text-left p-3 rounded-xl border transition-all duration-200 group animate-fade-in
            ${selectedId === msg.id
              ? 'active bg-violet-500/8 border-violet-500/15'
              : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.035] hover:border-white/[0.08]'
            }`}
          style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(msg.from)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-white text-[10px] font-bold">{senderInitial(msg.from)}</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Sender & time */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {!msg.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400/50 flex-shrink-0" />
                  )}
                  <span className={`text-xs truncate ${!msg.isRead ? 'text-white font-semibold' : 'text-white/45 font-medium'}`}>
                    {senderName(msg.from)}
                  </span>
                </div>
                <span className="text-[10px] text-white/15 flex-shrink-0 tabular-nums font-medium">
                  {timeAgo(msg.receivedAt)}
                </span>
              </div>

              {/* Subject */}
              <p className={`text-[11px] truncate ${!msg.isRead ? 'text-white/65 font-medium' : 'text-white/25'}`}>
                {msg.subject || '(No subject)'}
              </p>
            </div>

            {/* Arrow */}
            <svg className="w-3.5 h-3.5 text-white/0 group-hover:text-white/15 transition-all mt-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
};

export default InboxList;

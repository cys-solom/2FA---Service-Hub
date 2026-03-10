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
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function senderName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1] : from.split('@')[0];
}

const InboxList: React.FC<InboxListProps> = ({ messages, selectedId, onSelect }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] mb-3">
          <svg className="w-6 h-6 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-white/20 text-xs mb-1">No messages yet</p>
        <p className="text-white/10 text-[10px]">Incoming emails will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg)}
          className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 group
            ${selectedId === msg.id
              ? 'bg-violet-500/10 border-violet-500/20'
              : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]'
            }`}
        >
          <div className="flex items-start gap-3">
            {/* Unread indicator */}
            <div className="pt-1.5 flex-shrink-0">
              {!msg.isRead ? (
                <div className="w-2 h-2 rounded-full bg-violet-400 shadow-sm shadow-violet-400/50" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Sender & time */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-xs font-semibold truncate ${!msg.isRead ? 'text-white' : 'text-white/50'}`}>
                  {senderName(msg.from)}
                </span>
                <span className="text-[10px] text-white/20 flex-shrink-0 tabular-nums">
                  {timeAgo(msg.receivedAt)}
                </span>
              </div>

              {/* Subject */}
              <p className={`text-[11px] truncate mb-0.5 ${!msg.isRead ? 'text-white/70 font-medium' : 'text-white/30'}`}>
                {msg.subject || '(No subject)'}
              </p>

              {/* Snippet */}
              <p className="text-[10px] text-white/15 truncate">
                {msg.snippet}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default InboxList;

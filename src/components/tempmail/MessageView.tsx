import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { TempMessage } from '../../services/tempmail-service';

interface MessageViewProps {
  message: TempMessage;
  onBack: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const MessageView: React.FC<MessageViewProps> = ({ message, onBack }) => {
  // Sanitize HTML for safe rendering
  const safeHtml = useMemo(() => {
    if (!message.htmlBody) return null;
    return DOMPurify.sanitize(message.htmlBody, {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'img', 'blockquote', 'pre', 'code',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'style', 'class', 'alt', 'src', 'width', 'height',
        'cellpadding', 'cellspacing', 'border', 'align', 'valign',
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      ADD_ATTR: ['target'],
    });
  }, [message.htmlBody]);

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-4 group"
      >
        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to inbox
      </button>

      {/* Message header */}
      <div className="space-y-3 mb-5 pb-5 border-b border-white/[0.06]">
        <h2 className="text-base font-semibold text-white leading-snug">
          {message.subject || '(No subject)'}
        </h2>

        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <span className="text-white/25 font-medium">From</span>
          <span className="text-white/50 truncate">{message.from}</span>

          <span className="text-white/25 font-medium">To</span>
          <span className="text-white/50 truncate font-mono text-[11px]">{message.to}</span>

          <span className="text-white/25 font-medium">Date</span>
          <span className="text-white/50 tabular-nums">{formatDate(message.receivedAt)}</span>
        </div>
      </div>

      {/* Message body */}
      <div className="email-body">
        {safeHtml ? (
          <div
            className="text-sm text-white/60 leading-relaxed [&_a]:text-violet-400 [&_a]:underline [&_a:hover]:text-violet-300 [&_strong]:text-white/80 [&_h2]:text-white/80 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_p]:mb-2 [&_hr]:border-white/[0.06] [&_hr]:my-4"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <pre className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap font-sans">
            {message.textBody || 'No content'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default MessageView;

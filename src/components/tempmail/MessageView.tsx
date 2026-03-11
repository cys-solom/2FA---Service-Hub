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

function senderInitial(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  const name = match ? match[1].replace(/"/g, '').trim() : from.split('@')[0];
  return name.charAt(0).toUpperCase();
}

const MessageView: React.FC<MessageViewProps> = ({ message, onBack }) => {
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
    <div className="animate-slide-right">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-all mb-5 group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Back</span>
      </button>

      {/* Message header */}
      <div className="space-y-4 mb-5 pb-5 border-b border-white/[0.05]">
        <div className="flex items-start gap-3">
          {/* Sender avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/15">
            <span className="text-white text-xs font-bold">{senderInitial(message.from)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white/90 leading-snug mb-1">
              {message.subject || '(No subject)'}
            </h2>
            <p className="text-xs text-white/30 truncate">{message.from}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-white/15 ml-12">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span className="font-mono truncate max-w-[160px]">{message.to}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="tabular-nums">{formatDate(message.receivedAt)}</span>
          </div>
        </div>
      </div>

      {/* Message body */}
      <div className="email-body">
        {safeHtml ? (
          <div
            className="text-sm text-white/55 leading-relaxed [&_a]:text-violet-400 [&_a]:underline [&_a:hover]:text-violet-300 [&_strong]:text-white/75 [&_b]:text-white/75 [&_h1]:text-white/80 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-white/75 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-white/70 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_hr]:border-white/[0.05] [&_hr]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-white/40 [&_code]:bg-white/[0.05] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_img]:max-w-full [&_img]:h-auto [&_table]:w-full"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : message.textBody ? (
          <pre className="text-sm text-white/45 leading-relaxed whitespace-pre-wrap font-sans">
            {message.textBody}
          </pre>
        ) : (
          <div className="text-center py-8">
            <svg className="w-10 h-10 text-white/10 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-white/20 text-xs">This email has no viewable content</p>
            <p className="text-white/10 text-[10px] mt-1">The message may contain only images or attachments</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageView;

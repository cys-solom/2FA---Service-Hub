import React, { useMemo, useCallback, useState } from 'react';
import DOMPurify from 'dompurify';
import type { TempMessage } from '../../services/tempmail-service';
import { extractOTP } from '../../utils/otp-extractor';

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
  const [otpCopied, setOtpCopied] = useState(false);

  const safeHtml = useMemo(() => {
    if (!message.htmlBody) return null;
    return DOMPurify.sanitize(message.htmlBody, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'meta', 'link'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
      ADD_ATTR: ['target'],
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
    });
  }, [message.htmlBody]);

  // Auto-extract OTP from the message
  const detectedOTP = useMemo(() => {
    const bodyText = message.htmlBody || message.textBody || '';
    const subjectText = message.subject || '';
    // Try body first, then subject
    return extractOTP(bodyText) || extractOTP(subjectText);
  }, [message.htmlBody, message.textBody, message.subject]);

  const handleCopyOTP = useCallback(() => {
    if (!detectedOTP) return;
    navigator.clipboard.writeText(detectedOTP.code).then(() => {
      setOtpCopied(true);
      setTimeout(() => setOtpCopied(false), 2000);
    }).catch(() => {});
  }, [detectedOTP]);

  return (
    <div className="animate-slide-right">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-all mb-5 group touch-manipulation"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Back</span>
      </button>

      {/* ── OTP Detection Banner ───────────────────── */}
      {detectedOTP && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400/60 font-semibold uppercase tracking-widest mb-0.5">
                  Verification Code Detected
                </p>
                <p className="font-mono text-xl font-bold text-emerald-300 tracking-[0.2em]">
                  {detectedOTP.code}
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyOTP}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 touch-manipulation ${
                otpCopied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {otpCopied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Message header */}
      <div className="space-y-4 mb-5 pb-5 border-b border-white/[0.05]">
        <div className="flex items-start gap-3">
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
            className="text-sm text-white/70 leading-relaxed [&_a]:text-violet-400 [&_a]:underline [&_a:hover]:text-violet-300 [&_strong]:text-white/80 [&_b]:text-white/80 [&_h1]:text-white/85 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-white/80 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-white/75 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_hr]:border-white/[0.05] [&_hr]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_table]:w-full [&_td]:p-1 [&_th]:p-1 [&_center]:block [&_font]:text-inherit"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : message.textBody ? (
          <pre className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap font-sans">
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

import React, { useState } from 'react';
import type { ExpiryOption } from '../../services/tempmail-service';
import { EXPIRY_OPTIONS } from '../../services/tempmail-service';

interface EmailGeneratorProps {
  onGenerate: (expiry: ExpiryOption) => void;
  isLoading: boolean;
  error: string | null;
}

const EmailGenerator: React.FC<EmailGeneratorProps> = ({ onGenerate, isLoading, error }) => {
  const [expiry, setExpiry] = useState<ExpiryOption>(30);

  return (
    <div className="glass-card p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Expiry selector */}
        <select
          value={expiry}
          onChange={(e) => setExpiry(Number(e.target.value) as ExpiryOption)}
          className="input-field text-sm !py-3 sm:w-40 appearance-none cursor-pointer"
          aria-label="Mailbox expiry time"
        >
          {EXPIRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Generate button */}
        <button
          onClick={() => onGenerate(expiry)}
          disabled={isLoading}
          className="btn-primary flex-1 !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          Generate Temp Email
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400/80 text-xs mt-3 animate-fade-in" role="alert">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default EmailGenerator;

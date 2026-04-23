import React, { useCallback } from 'react';
import { formatCode } from '../utils/totp';

interface CodeDisplayProps {
  code: string | null;
  isActive: boolean;
  onCopy: () => void;
}

/**
 * TOTP code displayed in a large, tappable container.
 * Tapping copies the generated code only (not the secret).
 */
const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, isActive, onCopy }) => {
  const handleCopy = useCallback(() => {
    if (code) onCopy();
  }, [code, onCopy]);

  if (!isActive || !code) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] mb-3">
          <svg className="w-6 h-6 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-white/15 text-xs">Enter a secret to generate your code</p>
      </div>
    );
  }

  const formatted = formatCode(code);

  return (
    <div className="text-center py-4 animate-scale-in" style={{ opacity: 0 }}>
      {/* Label */}
      <p className="text-white/25 text-[10px] uppercase tracking-widest font-semibold mb-3">Generated Code</p>

      {/* Code container — large touch target */}
      <div
        className="inline-flex items-center justify-center w-full max-w-xs mx-auto
                    px-5 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]
                    cursor-pointer group transition-all duration-200
                    hover:bg-white/[0.06] hover:border-white/[0.1]
                    active:bg-white/[0.08] active:scale-[0.98]
                    touch-manipulation select-none"
        onClick={handleCopy}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
        title="Tap to copy code"
        aria-label={`TOTP code: ${code}. Tap to copy.`}
      >
        <span className="font-mono text-4xl sm:text-5xl font-bold tracking-[0.18em] text-white code-glow select-all whitespace-nowrap">
          {formatted}
        </span>
      </div>

      {/* Hint */}
      <p className="text-white/20 text-[10px] mt-2.5 tracking-wide">
        tap to copy
      </p>
    </div>
  );
};

export default CodeDisplay;

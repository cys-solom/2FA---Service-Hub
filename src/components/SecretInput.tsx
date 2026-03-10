import React, { useState, useCallback } from 'react';

interface SecretInputProps {
  secret: string;
  onSecretChange: (secret: string) => void;
  error: string | null;
}

const SecretInput: React.FC<SecretInputProps> = ({ secret, onSecretChange, error }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) onSecretChange(text.trim());
    } catch {
      // Clipboard API may not be available
    }
  }, [onSecretChange]);

  return (
    <div className="space-y-3">
      <label htmlFor="secret-input" className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
        Enter 2FA Secret
      </label>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
        <div className="relative">
          <input
            id="secret-input"
            type={isVisible ? 'text' : 'password'}
            value={secret}
            onChange={(e) => onSecretChange(e.target.value)}
            placeholder="Paste your Base32 secret key…"
            className={`input-field pr-24 font-mono text-sm tracking-widest ${
              error ? '!border-red-500/30 focus:!ring-red-500/30' : ''
            }`}
            autoComplete="off"
            spellCheck={false}
            aria-label="Enter 2FA Secret"
            aria-invalid={!!error}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsVisible(prev => !prev)}
              className="p-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200"
              title={isVisible ? 'Hide' : 'Show'}
              aria-label={isVisible ? 'Hide Secret' : 'Show Secret'}
            >
              {isVisible ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={handlePaste}
              className="p-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200"
              title="Paste"
              aria-label="Paste Secret"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400/80 text-xs animate-fade-in" role="alert">
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

export default SecretInput;

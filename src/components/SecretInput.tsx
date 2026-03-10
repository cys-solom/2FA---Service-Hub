import React, { useCallback } from 'react';

interface SecretInputProps {
  secret: string;
  onSecretChange: (secret: string) => void;
  error: string | null;
}

const SecretInput: React.FC<SecretInputProps> = ({ secret, onSecretChange, error }) => {

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        // Strip spaces and whitespace automatically
        onSecretChange(text.replace(/\s/g, '').toUpperCase());
      }
    } catch {
      // Clipboard API may not be available
    }
  }, [onSecretChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip spaces automatically as the user types or pastes
    const cleaned = e.target.value.replace(/\s/g, '').toUpperCase();
    onSecretChange(cleaned);
  }, [onSecretChange]);

  return (
    <div className="space-y-3">
      <label htmlFor="secret-input" className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
        Enter 2FA Secret
      </label>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
        <div className="relative">
          {/* Always show as plain text so the full code is visible */}
          <input
            id="secret-input"
            type="text"
            value={secret}
            onChange={handleChange}
            placeholder="Paste your Base32 secret key…"
            className={`input-field pr-14 font-mono text-sm tracking-widest ${
              error ? '!border-red-500/30 focus:!ring-red-500/30' : ''
            }`}
            autoComplete="off"
            spellCheck={false}
            aria-label="Enter 2FA Secret"
            aria-invalid={!!error}
          />

          {/* Paste button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
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

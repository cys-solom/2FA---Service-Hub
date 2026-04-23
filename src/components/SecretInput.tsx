import React, { useCallback } from 'react';

interface SecretInputProps {
  secret: string;
  onSecretChange: (secret: string) => void;
  error: string | null;
}

const SecretInput: React.FC<SecretInputProps> = ({ secret, onSecretChange, error }) => {

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
          {/* Text input — user can also long-press paste directly here on mobile */}
          <input
            id="secret-input"
            type="text"
            value={secret}
            onChange={handleChange}
            placeholder="Paste your Base32 secret key…"
            className={`input-field font-mono text-sm tracking-widest ${
              error ? '!border-red-500/30 focus:!ring-red-500/30' : ''
            }`}
            autoComplete="off"
            spellCheck={false}
            aria-label="Enter 2FA Secret"
            aria-invalid={!!error}
          />
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

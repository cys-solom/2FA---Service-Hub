import React, { useState } from 'react';
import type { Algorithm, TOTPConfig } from '../utils/totp';

interface AdvancedSettingsProps {
  /** Current TOTP configuration */
  config: TOTPConfig;
  /** Callback when config changes */
  onConfigChange: (config: Partial<TOTPConfig>) => void;
  /** Callback for otpauth URI input */
  onOtpAuthUri: (uri: string) => void;
}

/**
 * AdvancedSettings provides a collapsible panel for configuring
 * TOTP parameters beyond the defaults: digits, period, algorithm,
 * issuer, account label, and otpauth:// URI parsing.
 */
const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ config, onConfigChange, onOtpAuthUri }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [otpUri, setOtpUri] = useState('');

  const handleUriSubmit = () => {
    if (otpUri.trim()) {
      onOtpAuthUri(otpUri.trim());
      setOtpUri('');
    }
  };

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                   hover:bg-white/[0.08] hover:border-white/15 transition-all text-sm text-white/60 hover:text-white/80"
        aria-expanded={isOpen}
        aria-controls="advanced-settings-panel"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Advanced Settings
        </span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div id="advanced-settings-panel" className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-4 animate-fade-in">
          {/* otpauth:// URI input */}
          <div>
            <label htmlFor="otpauth-uri" className="block text-xs font-medium text-white/50 mb-1.5">
              otpauth:// URI
            </label>
            <div className="flex gap-2">
              <input
                id="otpauth-uri"
                type="text"
                value={otpUri}
                onChange={(e) => setOtpUri(e.target.value)}
                placeholder="otpauth://totp/Example:user@example.com?secret=..."
                className="input-field text-xs flex-1"
                spellCheck={false}
              />
              <button onClick={handleUriSubmit} className="btn-secondary text-xs px-3" disabled={!otpUri.trim()}>
                Parse
              </button>
            </div>
          </div>

          {/* Settings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Digits */}
            <div>
              <label htmlFor="digits-select" className="block text-xs font-medium text-white/50 mb-1.5">
                Digits
              </label>
              <select
                id="digits-select"
                value={config.digits}
                onChange={(e) => onConfigChange({ digits: parseInt(e.target.value) as 6 | 8 })}
                className="input-field text-sm bg-surface-800"
              >
                <option value={6}>6 digits</option>
                <option value={8}>8 digits</option>
              </select>
            </div>

            {/* Period */}
            <div>
              <label htmlFor="period-input" className="block text-xs font-medium text-white/50 mb-1.5">
                Period (seconds)
              </label>
              <input
                id="period-input"
                type="number"
                min={10}
                max={120}
                value={config.period}
                onChange={(e) => onConfigChange({ period: parseInt(e.target.value) || 30 })}
                className="input-field text-sm"
              />
            </div>

            {/* Algorithm */}
            <div>
              <label htmlFor="algorithm-select" className="block text-xs font-medium text-white/50 mb-1.5">
                Algorithm
              </label>
              <select
                id="algorithm-select"
                value={config.algorithm}
                onChange={(e) => onConfigChange({ algorithm: e.target.value as Algorithm })}
                className="input-field text-sm bg-surface-800"
              >
                <option value="sha1">SHA-1</option>
                <option value="sha256">SHA-256</option>
                <option value="sha512">SHA-512</option>
              </select>
            </div>
          </div>

          {/* Issuer & Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issuer-input" className="block text-xs font-medium text-white/50 mb-1.5">
                Issuer
              </label>
              <input
                id="issuer-input"
                type="text"
                value={config.issuer || ''}
                onChange={(e) => onConfigChange({ issuer: e.target.value || undefined })}
                placeholder="e.g., Google, GitHub"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label htmlFor="label-input" className="block text-xs font-medium text-white/50 mb-1.5">
                Account Label
              </label>
              <input
                id="label-input"
                type="text"
                value={config.label || ''}
                onChange={(e) => onConfigChange({ label: e.target.value || undefined })}
                placeholder="e.g., user@example.com"
                className="input-field text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSettings;

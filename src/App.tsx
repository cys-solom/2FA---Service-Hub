/**
 * Service Hub - 2FA
 * 
 * Main application component. Pure client-side TOTP generator.
 * No secrets are ever sent to a server, stored, or logged.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SecretInput from './components/SecretInput';
import CodeDisplay from './components/CodeDisplay';
import TimerBar from './components/TimerBar';
import SecurityNotice from './components/SecurityNotice';
import Footer from './components/Footer';
import Toast from './components/Toast';
import type { ToastData } from './components/Toast';
import {
  generateTOTP,
  getTimeRemaining,
  validateBase32,
  cleanSecret,
  extractSecretFromURL,
} from './utils/totp';

/**
 * Updates the URL path to reflect the current secret.
 * Uses replaceState to avoid polluting browser history.
 */
function syncSecretToURL(secret: string) {
  const cleaned = cleanSecret(secret);
  if (cleaned && validateBase32(cleaned)) {
    window.history.replaceState({}, '', `/${cleaned}`);
  } else if (!cleaned) {
    window.history.replaceState({}, '', '/');
  }
}

function App() {
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const generateCode = useCallback((secretKey: string) => {
    const cleaned = cleanSecret(secretKey);
    if (!validateBase32(cleaned)) {
      setCode(null);
      if (cleaned.length > 0) {
        setError('Invalid 2FA secret. Please enter a valid Base32 key.');
      }
      return;
    }
    try {
      const newCode = generateTOTP(cleaned);
      setCode(newCode);
      setError(null);
    } catch {
      setCode(null);
      setError('Invalid 2FA secret. Please enter a valid Base32 key.');
    }
  }, []);

  const handleSecretChange = useCallback((newSecret: string) => {
    setSecret(newSecret);
    setError(null);
    const cleaned = cleanSecret(newSecret);
    if (cleaned.length === 0) {
      setCode(null);
      syncSecretToURL('');
      return;
    }
    generateCode(newSecret);
    // Sync secret to URL path in real-time
    syncSecretToURL(newSecret);
  }, [generateCode]);

  const handleClear = useCallback(() => {
    setSecret('');
    setCode(null);
    setError(null);
    syncSecretToURL('');
    addToast('Secret cleared from memory', 'info');
  }, [addToast]);

  /** Actually copy the code to clipboard */
  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        addToast('Code copied to clipboard', 'success');
      }).catch(() => {
        addToast('Failed to copy', 'error');
      });
    }
  }, [code, addToast]);

  // Extract secret from URL on mount
  useEffect(() => {
    const urlData = extractSecretFromURL();
    if (urlData) {
      setSecret(urlData.secret);
      generateCode(urlData.secret);
      // Keep the secret in the URL (don't clean it)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const tick = () => {
      const remaining = getTimeRemaining(30);
      setTimeRemaining(remaining);
      if (remaining === 30 && secret) {
        generateCode(secret);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [secret, generateCode]);

  const isActive = !!code && !!secret;

  return (
    <div className="min-h-screen relative">
      {/* Animated background */}
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      {/* Content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          <Header />

          {/* Main card */}
          <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
            {/* Secret input */}
            <SecretInput
              secret={secret}
              onSecretChange={handleSecretChange}
              error={error}
            />

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* Code display */}
            <CodeDisplay
              code={code}
              isActive={isActive}
              onCopy={handleCopy}
            />

            {/* Timer */}
            <TimerBar
              timeRemaining={timeRemaining}
              period={30}
              isActive={isActive}
            />

            {/* Action buttons */}
            {isActive && (
              <div className="flex gap-2.5 animate-fade-in">
                <button onClick={handleCopy} className="btn-primary flex-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Code
                </button>
                <button onClick={handleClear} className="btn-danger px-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </button>
              </div>
            )}
          </div>

          <SecurityNotice />
          <Footer />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;

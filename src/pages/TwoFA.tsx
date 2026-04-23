/**
 * 2FA Page — TOTP code generator with copy/paste for secret & code.
 *
 * Layout:
 *   1. Secret Input  +  Paste / Copy Secret buttons
 *   2. Generated TOTP Code  +  Copy Code button
 *   3. Timer bar
 *   4. Clear button
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import SecretInput from '../components/SecretInput';
import CodeDisplay from '../components/CodeDisplay';
import TimerBar from '../components/TimerBar';
import SecurityNotice from '../components/SecurityNotice';
import CyberBackground from '../components/CyberBackground';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import type { ToastData } from '../components/Toast';
import {
  generateTOTP,
  getTimeRemaining,
  validateBase32,
  cleanSecret,
  extractSecretFromURL,
} from '../utils/totp';

function syncSecretToURL(secret: string) {
  const cleaned = cleanSecret(secret);
  if (cleaned && validateBase32(cleaned)) {
    window.history.replaceState({}, '', `/2fa-code/${cleaned}`);
  } else if (!cleaned) {
    window.history.replaceState({}, '', '/2fa-code');
  }
}

function TwoFAPage() {
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
    syncSecretToURL(newSecret);
  }, [generateCode]);

  const handleClear = useCallback(() => {
    setSecret('');
    setCode(null);
    setError(null);
    syncSecretToURL('');
    addToast('Secret cleared from memory', 'info');
  }, [addToast]);

  // ── Copy / Paste for the SECRET key ──────────────────
  const handleCopySecret = useCallback(() => {
    if (!secret) {
      addToast('Nothing to copy', 'error');
      return;
    }
    navigator.clipboard.writeText(secret).then(() => {
      addToast('Secret copied', 'success');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
  }, [secret, addToast]);

  const handlePasteSecret = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.replace(/\s/g, '').toUpperCase();
        handleSecretChange(cleaned);
        addToast('Secret pasted', 'success');
      }
    } catch {
      addToast('Paste failed — please allow clipboard access', 'error');
    }
  }, [handleSecretChange, addToast]);

  // ── Copy the generated TOTP code ─────────────────────
  const handleCopyCode = useCallback(() => {
    if (!code) {
      addToast('No code generated yet', 'error');
      return;
    }
    navigator.clipboard.writeText(code).then(() => {
      addToast('Code copied!', 'success');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
  }, [code, addToast]);

  // Extract secret from URL on mount
  useEffect(() => {
    const urlData = extractSecretFromURL();
    if (urlData) {
      setSecret(urlData.secret);
      generateCode(urlData.secret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer and visibility
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    let lastPeriod = Math.floor(Date.now() / 30000);

    const tick = () => {
      const remaining = getTimeRemaining(30);
      setTimeRemaining(remaining);

      const currentPeriod = Math.floor(Date.now() / 30000);
      if (secret && currentPeriod !== lastPeriod) {
        generateCode(secret);
        lastPeriod = currentPeriod;
      }
    };

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        tick();
        if (secret) {
          generateCode(secret);
        }
      }
    };

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [secret, generateCode]);

  const isActive = !!code && !!secret;

  return (
    <div className="min-h-screen relative">
      {/* Deep space background */}
      <div className="bg-deep-space">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>
      <div className="stars-layer" />
      <div className="grid-pattern" />
      <div className="noise-overlay" />
      <div className="vignette" />
      <CyberBackground variant="security" />

      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8 pt-24">
        <div className="w-full max-w-md">
          <Header />

          <div className="glass-card p-5 sm:p-8 space-y-5 animate-fade-in-up" style={{ animationDelay: '0.15s', opacity: 0 }}>

            {/* ── Section 1: Secret Input ──────────────── */}
            <div>
              <SecretInput secret={secret} onSecretChange={handleSecretChange} error={error} />

              {/* Paste / Copy SECRET buttons — large touch targets */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handlePasteSecret}
                  className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-white/5 border border-white/10
                             text-white/60 active:bg-white/15 active:text-white
                             hover:bg-white/10 hover:text-white
                             text-xs font-medium transition-all
                             flex items-center justify-center gap-2
                             touch-manipulation"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Paste Secret
                </button>
                <button
                  onClick={handleCopySecret}
                  className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-white/5 border border-white/10
                             text-white/60 active:bg-white/15 active:text-white
                             hover:bg-white/10 hover:text-white
                             text-xs font-medium transition-all
                             flex items-center justify-center gap-2
                             touch-manipulation"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Secret
                </button>
              </div>
            </div>

            {/* ── Divider ─────────────────────────────── */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* ── Section 2: Generated Code ────────────── */}
            <CodeDisplay code={code} isActive={isActive} onCopy={handleCopyCode} />
            <TimerBar timeRemaining={timeRemaining} period={30} isActive={isActive} />

            {/* ── Section 3: Copy Code + Clear ─────────── */}
            {isActive && (
              <div className="flex gap-2.5 animate-fade-in">
                <button
                  onClick={handleCopyCode}
                  className="btn-primary-emerald flex-1 min-h-[48px] touch-manipulation"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Code
                </button>
                <button
                  onClick={handleClear}
                  className="btn-danger min-h-[48px] px-5 touch-manipulation"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </button>
              </div>
            )}
          </div>

          <SecurityNotice />
          <Footer
            brand="Service Hub — 2FA"
            tagline="Compatible with Google · ChatGPT · GitHub · Adobe · Discord · Gemini & all 2FA services"
          />
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default TwoFAPage;

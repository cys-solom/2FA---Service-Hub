/**
 * 2FA Page — TOTP code generator with copy/paste for secret & code.
 *
 * Layout:
 *   1. Secret Input  +  Paste / Copy Secret buttons
 *   2. Generated TOTP Code  +  Copy Code button
 *   3. Timer bar
 *   4. Clear button
 *
 * Mobile Paste: Uses a popup text field (native long-press paste)
 * to avoid Clipboard API permission issues on mobile browsers.
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
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);

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

  // ── Copy the SECRET key ──────────────────────────────
  const handleCopySecret = useCallback(() => {
    if (!secret) {
      addToast('Nothing to copy', 'error');
      return;
    }
    navigator.clipboard.writeText(secret).then(() => {
      addToast('Secret copied', 'success');
    }).catch(() => {
      // Fallback: select the input so user can copy manually
      const input = document.getElementById('secret-input') as HTMLInputElement;
      if (input) {
        input.select();
        addToast('Text selected — copy manually', 'info');
      } else {
        addToast('Failed to copy', 'error');
      }
    });
  }, [secret, addToast]);

  // ── Paste SECRET — tries Clipboard API first, falls back to modal ──
  const handlePasteSecret = useCallback(async () => {
    // Try the Clipboard API first (works on desktop, some mobile)
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const cleaned = text.replace(/\s/g, '').toUpperCase();
        handleSecretChange(cleaned);
        addToast('Secret pasted', 'success');
        return;
      }
    } catch {
      // Clipboard API blocked/denied → open the paste modal
    }
    // Fallback: show manual paste modal
    setPasteInput('');
    setShowPasteModal(true);
    // Auto-focus the textarea after it renders
    setTimeout(() => pasteInputRef.current?.focus(), 100);
  }, [handleSecretChange, addToast]);

  // ── Confirm paste from modal ─────────────────────────
  const handleConfirmPaste = useCallback(() => {
    if (pasteInput.trim()) {
      const cleaned = pasteInput.replace(/\s/g, '').toUpperCase();
      handleSecretChange(cleaned);
      addToast('Secret pasted', 'success');
    }
    setShowPasteModal(false);
    setPasteInput('');
  }, [pasteInput, handleSecretChange, addToast]);

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

              {/* Paste / Copy SECRET buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handlePasteSecret}
                  className="flex-1 min-h-[48px] py-2.5 px-3 rounded-xl bg-white/5 border border-white/10
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
                  className="flex-1 min-h-[48px] py-2.5 px-3 rounded-xl bg-white/5 border border-white/10
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

      {/* ════════════════════════════════════════════════
          ██  PASTE MODAL (Mobile Fallback)
          ════════════════════════════════════════════════ */}
      {showPasteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={() => setShowPasteModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

          {/* Modal card */}
          <div
            className="relative w-full max-w-sm glass-card p-6 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Paste Secret Key</h3>
                  <p className="text-[10px] text-white/30">Long-press below → Paste</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-2 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/5 transition-all touch-manipulation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Paste area — the user long-presses here and uses native paste */}
            <textarea
              ref={pasteInputRef}
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Long-press here and tap Paste…"
              rows={3}
              className="input-field !text-sm font-mono resize-none touch-manipulation"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-medium
                           text-white/40 bg-white/[0.03] border border-white/[0.06]
                           hover:bg-white/[0.06] hover:text-white/60
                           active:bg-white/[0.08]
                           transition-all touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPaste}
                disabled={!pasteInput.trim()}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-semibold text-white
                           bg-gradient-to-r from-violet-600 to-indigo-600
                           shadow-lg shadow-violet-500/20
                           hover:shadow-violet-500/30
                           active:scale-[0.97]
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all touch-manipulation"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default TwoFAPage;

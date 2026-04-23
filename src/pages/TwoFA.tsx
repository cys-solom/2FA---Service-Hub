/**
 * 2FA Page — TOTP code generator
 *
 * Features:
 *   - Paste / Copy Secret (with mobile paste modal fallback)
 *   - Saved Secrets (localStorage) with quick-switch dropdown
 *   - Auto-Copy option (copies new code on every refresh)
 *   - Generated TOTP Code display + Copy Code
 *   - Timer bar with color-coded urgency
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
import {
  getSavedSecrets,
  addSavedSecret,
  removeSavedSecret,
  getAutoCopy,
  setAutoCopy as setAutoCopyPref,
} from '../services/secrets-service';
import type { SavedSecret } from '../services/secrets-service';

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
  const [savedSecrets, setSavedSecrets] = useState<SavedSecret[]>(getSavedSecrets());
  const [showSaved, setShowSaved] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [autoCopy, setAutoCopy] = useState(getAutoCopy());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastCopiedPeriodRef = useRef<number>(0);

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

  // ── Copy SECRET ──────────────────────────────────────
  const handleCopySecret = useCallback(() => {
    if (!secret) { addToast('Nothing to copy', 'error'); return; }
    navigator.clipboard.writeText(secret).then(() => {
      addToast('Secret copied', 'success');
    }).catch(() => {
      const input = document.getElementById('secret-input') as HTMLInputElement;
      if (input) { input.select(); addToast('Text selected — copy manually', 'info'); }
      else addToast('Failed to copy', 'error');
    });
  }, [secret, addToast]);

  // ── Paste SECRET (with mobile fallback) ──────────────
  const handlePasteSecret = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        handleSecretChange(text.replace(/\s/g, '').toUpperCase());
        addToast('Secret pasted', 'success');
        return;
      }
    } catch { /* fallback */ }
    setPasteInput('');
    setShowPasteModal(true);
    setTimeout(() => pasteInputRef.current?.focus(), 100);
  }, [handleSecretChange, addToast]);

  const handleConfirmPaste = useCallback(() => {
    if (pasteInput.trim()) {
      handleSecretChange(pasteInput.replace(/\s/g, '').toUpperCase());
      addToast('Secret pasted', 'success');
    }
    setShowPasteModal(false);
    setPasteInput('');
  }, [pasteInput, handleSecretChange, addToast]);

  // ── Copy TOTP CODE ───────────────────────────────────
  const handleCopyCode = useCallback(() => {
    if (!code) { addToast('No code generated yet', 'error'); return; }
    navigator.clipboard.writeText(code).then(() => {
      addToast('Code copied!', 'success');
    }).catch(() => addToast('Failed to copy', 'error'));
  }, [code, addToast]);

  // ── Save Secret ──────────────────────────────────────
  const handleSaveSecret = useCallback(() => {
    if (!saveLabel.trim() || !secret) return;
    addSavedSecret(saveLabel.trim(), cleanSecret(secret));
    setSavedSecrets(getSavedSecrets());
    setShowSaveForm(false);
    setSaveLabel('');
    addToast(`Saved as "${saveLabel.trim()}"`, 'success');
  }, [saveLabel, secret, addToast]);

  const handleLoadSecret = useCallback((s: SavedSecret) => {
    handleSecretChange(s.secret);
    setShowSaved(false);
    addToast(`Loaded "${s.label}"`, 'success');
  }, [handleSecretChange, addToast]);

  const handleDeleteSecret = useCallback((id: string, label: string) => {
    removeSavedSecret(id);
    setSavedSecrets(getSavedSecrets());
    addToast(`"${label}" removed`, 'info');
  }, [addToast]);

  // ── Auto-Copy toggle ────────────────────────────────
  const handleToggleAutoCopy = useCallback(() => {
    const newVal = !autoCopy;
    setAutoCopy(newVal);
    setAutoCopyPref(newVal);
    addToast(newVal ? 'Auto-copy enabled' : 'Auto-copy disabled', 'info');
  }, [autoCopy, addToast]);

  // Extract secret from URL on mount
  useEffect(() => {
    const urlData = extractSecretFromURL();
    if (urlData) {
      setSecret(urlData.secret);
      generateCode(urlData.secret);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer, code refresh, and auto-copy
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let lastPeriod = Math.floor(Date.now() / 30000);

    const tick = () => {
      const remaining = getTimeRemaining(30);
      setTimeRemaining(remaining);
      const currentPeriod = Math.floor(Date.now() / 30000);
      if (secret && currentPeriod !== lastPeriod) {
        const cleaned = cleanSecret(secret);
        if (validateBase32(cleaned)) {
          const newCode = generateTOTP(cleaned);
          setCode(newCode);
          // Auto-copy on new period
          if (autoCopy && newCode && lastCopiedPeriodRef.current !== currentPeriod) {
            navigator.clipboard.writeText(newCode).catch(() => {});
            lastCopiedPeriodRef.current = currentPeriod;
          }
        }
        lastPeriod = currentPeriod;
      }
    };

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        tick();
        if (secret) generateCode(secret);
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
  }, [secret, generateCode, autoCopy]);

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

            {/* ── Secret Input ─────────────────────────── */}
            <div>
              <SecretInput secret={secret} onSecretChange={handleSecretChange} error={error} />

              {/* Paste / Copy buttons */}
              <div className="flex gap-2 mt-3">
                <button onClick={handlePasteSecret}
                  className="flex-1 min-h-[48px] py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 active:bg-white/15 active:text-white hover:bg-white/10 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Paste Secret
                </button>
                <button onClick={handleCopySecret}
                  className="flex-1 min-h-[48px] py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 active:bg-white/15 active:text-white hover:bg-white/10 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Secret
                </button>
              </div>

              {/* Save / Load Secrets row */}
              <div className="flex gap-2 mt-2">
                {/* Save current */}
                {secret && cleanSecret(secret) && !showSaveForm && (
                  <button onClick={() => { setShowSaveForm(true); setSaveLabel(''); }}
                    className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/70 hover:bg-emerald-500/15 hover:text-emerald-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5 touch-manipulation">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save
                  </button>
                )}
                {/* Load saved */}
                {savedSecrets.length > 0 && (
                  <button onClick={() => setShowSaved(!showSaved)}
                    className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-violet-500/8 border border-violet-500/15 text-violet-400/70 hover:bg-violet-500/15 hover:text-violet-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5 touch-manipulation">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Saved ({savedSecrets.length})
                  </button>
                )}
              </div>

              {/* Save form */}
              {showSaveForm && (
                <div className="mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveLabel}
                      onChange={(e) => setSaveLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveSecret()}
                      placeholder="Label (e.g. Gmail, GitHub)"
                      className="input-field !py-2 !text-xs flex-1"
                      autoFocus
                    />
                    <button onClick={handleSaveSecret} disabled={!saveLabel.trim()}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 transition-all touch-manipulation">
                      Save
                    </button>
                    <button onClick={() => setShowSaveForm(false)}
                      className="px-2 py-2 rounded-xl text-white/20 hover:text-white/50 transition-all touch-manipulation">
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Saved secrets dropdown */}
              {showSaved && savedSecrets.length > 0 && (
                <div className="mt-2 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-fade-in">
                  <div className="max-h-48 overflow-y-auto">
                    {savedSecrets.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.03] transition-all">
                        <button onClick={() => handleLoadSecret(s)} className="flex-1 text-left min-w-0 touch-manipulation">
                          <p className="text-xs text-white/70 font-medium truncate">{s.label}</p>
                          <p className="text-[10px] text-white/20 font-mono truncate">{s.secret.slice(0, 12)}…</p>
                        </button>
                        <button onClick={() => handleDeleteSecret(s.id, s.label)}
                          className="p-1.5 rounded-lg text-white/10 hover:text-red-400/60 hover:bg-red-500/10 transition-all flex-shrink-0 touch-manipulation">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Divider ─────────────────────────────── */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* ── Generated Code ───────────────────────── */}
            <CodeDisplay code={code} isActive={isActive} onCopy={handleCopyCode} />
            <TimerBar timeRemaining={timeRemaining} period={30} isActive={isActive} />

            {/* ── Actions row ──────────────────────────── */}
            {isActive && (
              <div className="space-y-2.5 animate-fade-in">
                <div className="flex gap-2.5">
                  <button onClick={handleCopyCode}
                    className="btn-primary-emerald flex-1 min-h-[48px] touch-manipulation">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Code
                  </button>
                  <button onClick={handleClear}
                    className="btn-danger min-h-[48px] px-5 touch-manipulation">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear
                  </button>
                </div>

                {/* Auto-copy toggle */}
                <button onClick={handleToggleAutoCopy}
                  className={`w-full min-h-[40px] py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 touch-manipulation border ${
                    autoCopy
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400/80'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/25 hover:text-white/40'
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={autoCopy
                        ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      } />
                  </svg>
                  Auto-Copy {autoCopy ? 'ON' : 'OFF'}
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

      {/* ── PASTE MODAL ──────────────────────────────── */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={() => setShowPasteModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-sm glass-card p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Paste Secret Key</h3>
                  <p className="text-[10px] text-white/30">Long-press below → Paste</p>
                </div>
              </div>
              <button onClick={() => setShowPasteModal(false)} className="p-2 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/5 transition-all touch-manipulation">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea ref={pasteInputRef} value={pasteInput} onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Long-press here and tap Paste…" rows={3}
              className="input-field !text-sm font-mono resize-none touch-manipulation" autoComplete="off" spellCheck={false} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowPasteModal(false)}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all touch-manipulation">
                Cancel
              </button>
              <button onClick={handleConfirmPaste} disabled={!pasteInput.trim()}
                className="flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation">
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

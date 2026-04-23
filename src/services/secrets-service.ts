/**
 * Saved Secrets Service
 *
 * Manages saved 2FA secrets in localStorage with labels.
 * Secrets are stored as-is (Base32) — no encryption since
 * they're already accessible in the browser's URL bar.
 */

export interface SavedSecret {
  id: string;
  label: string;
  secret: string;
  createdAt: number;
}

const STORAGE_KEY = 'sh_saved_secrets';
const AUTO_COPY_KEY = 'sh_auto_copy';

// ── Saved Secrets CRUD ────────────────────────────────

function load(): SavedSecret[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(secrets: SavedSecret[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
}

export function getSavedSecrets(): SavedSecret[] {
  return load();
}

export function addSavedSecret(label: string, secret: string): SavedSecret {
  const secrets = load();
  // Prevent duplicate secrets
  const existing = secrets.find(s => s.secret === secret);
  if (existing) {
    existing.label = label;
    save(secrets);
    return existing;
  }
  const entry: SavedSecret = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: label.trim(),
    secret: secret.trim().toUpperCase(),
    createdAt: Date.now(),
  };
  secrets.push(entry);
  save(secrets);
  return entry;
}

export function removeSavedSecret(id: string): void {
  save(load().filter(s => s.id !== id));
}

export function updateSavedSecretLabel(id: string, label: string): void {
  const secrets = load();
  const entry = secrets.find(s => s.id === id);
  if (entry) {
    entry.label = label.trim();
    save(secrets);
  }
}

// ── Auto-Copy Preference ──────────────────────────────

export function getAutoCopy(): boolean {
  return localStorage.getItem(AUTO_COPY_KEY) === 'true';
}

export function setAutoCopy(value: boolean): void {
  localStorage.setItem(AUTO_COPY_KEY, value ? 'true' : 'false');
}

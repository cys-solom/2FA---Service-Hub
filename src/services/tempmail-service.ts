/**
 * Temp Mail Service — Connects to Mailcow via IMAP API.
 *
 * Features:
 *   - Random OR Custom email prefix
 *   - No expiration (mailboxes persist in localStorage)
 *   - Strict TO filtering per address
 *   - Delete: single message, all messages for one inbox, admin purge all
 *   - Auto-cleanup: 30-day-old messages purged on each visit
 */

import { getPrimaryDomain } from './domain-config';

// ─── Types ─────────────────────────────────────────────────────────

export interface TempMailbox {
  id: string;
  email: string;
  createdAt: number;
}

export interface TempMessage {
  id: string;
  mailboxId: string;
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  snippet: string;
  receivedAt: number;
  isRead: boolean;
  uid?: number;
}

// ─── localStorage persistence ──────────────────────────────────────

const STORAGE_KEY = 'servicehub_mailboxes';

function loadMailboxes(): TempMailbox[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMailboxes(mailboxes: TempMailbox[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mailboxes));
}

// ─── Helpers ───────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function generateRandomPrefix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function sanitizePrefix(prefix: string): string {
  // Only allow letters, numbers, dots, hyphens, underscores
  return prefix.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30);
}

// ─── Cached messages (in-memory per session) ───────────────────────

let cachedMessages: Record<string, TempMessage[]> = {};

// ─── IMAP API Calls ───────────────────────────────────────────────

async function fetchInboxFromAPI(address: string): Promise<TempMessage[]> {
  try {
    const res = await fetch(`/api/mail/inbox?address=${encodeURIComponent(address)}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      return data.messages.map((msg: any) => ({
        id: String(msg.uid),
        mailboxId: '',
        from: msg.from || 'Unknown',
        to: msg.to || address,
        subject: msg.subject || '(No subject)',
        textBody: '',
        htmlBody: '',
        snippet: (msg.subject || '').slice(0, 80),
        receivedAt: msg.date || Date.now(),
        isRead: msg.isRead || false,
        uid: msg.uid,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchMessageFromAPI(uid: number, domain?: string): Promise<TempMessage | null> {
  try {
    const params = new URLSearchParams({ uid: String(uid) });
    if (domain) params.set('domain', domain);
    const res = await fetch(`/api/mail/message?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.message) {
      return {
        id: String(data.message.uid),
        mailboxId: '',
        from: data.message.from || 'Unknown',
        to: data.message.to || '',
        subject: data.message.subject || '(No subject)',
        textBody: data.message.textBody || '',
        htmlBody: data.message.htmlBody || '',
        snippet: (data.message.textBody || '').slice(0, 80),
        receivedAt: data.message.date || Date.now(),
        isRead: true,
        uid: data.message.uid,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteMessageFromAPI(uid: number, domain?: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ uid: String(uid) });
    if (domain) params.set('domain', domain);
    const res = await fetch(`/api/mail/delete?${params.toString()}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function clearInboxFromAPI(address: string): Promise<number> {
  try {
    const res = await fetch(`/api/mail/clear?address=${encodeURIComponent(address)}`, { method: 'DELETE' });
    const data = await res.json();
    return data.deleted || 0;
  } catch {
    return 0;
  }
}

export async function purgeAllFromAPI(): Promise<number> {
  try {
    const res = await fetch('/api/mail/purge', { method: 'DELETE' });
    const data = await res.json();
    return data.deleted || 0;
  } catch {
    return 0;
  }
}

export async function cleanupOldFromAPI(days: number = 30): Promise<number> {
  try {
    const res = await fetch(`/api/mail/cleanup?days=${days}`, { method: 'DELETE' });
    const data = await res.json();
    return data.deleted || 0;
  } catch {
    return 0;
  }
}

// ─── Auto-cleanup on load ──────────────────────────────────────────

let cleanupDone = false;
export function triggerAutoCleanup(): void {
  if (cleanupDone) return;
  cleanupDone = true;
  // Fire-and-forget: delete messages older than 30 days
  cleanupOldFromAPI(30).then(count => {
    if (count > 0) console.log(`Auto-cleanup: removed ${count} messages older than 30 days`);
  }).catch(() => {});
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Creates a mailbox with a random prefix.
 */
export function createMailbox(): { success: boolean; mailbox?: TempMailbox; error?: string } {
  const email = `${generateRandomPrefix()}@${getPrimaryDomain()}`;
  return createMailboxWithEmail(email);
}

/**
 * Creates a mailbox with a custom prefix.
 */
export function createCustomMailbox(prefix: string, domain?: string): { success: boolean; mailbox?: TempMailbox; error?: string } {
  const clean = sanitizePrefix(prefix);
  if (!clean || clean.length < 2) {
    return { success: false, error: 'Prefix must be at least 2 characters (letters, numbers, dots, hyphens)' };
  }

  const email = `${clean}@${domain || getPrimaryDomain()}`;
  
  // Check if already exists
  const existing = loadMailboxes();
  if (existing.some(m => m.email === email)) {
    return { success: false, error: 'This email address already exists in your list' };
  }

  return createMailboxWithEmail(email);
}

function createMailboxWithEmail(email: string): { success: boolean; mailbox?: TempMailbox; error?: string } {
  const mailbox: TempMailbox = {
    id: generateId(),
    email,
    createdAt: Date.now(),
  };

  const mailboxes = loadMailboxes();
  mailboxes.push(mailbox);
  saveMailboxes(mailboxes);
  cachedMessages[mailbox.id] = [];

  return { success: true, mailbox };
}

export function getAllMailboxes(): TempMailbox[] {
  return loadMailboxes();
}

export function getMailbox(mailboxId: string): TempMailbox | null {
  return loadMailboxes().find(m => m.id === mailboxId) || null;
}

export async function refreshInbox(mailboxId: string): Promise<TempMessage[]> {
  const mb = getMailbox(mailboxId);
  if (!mb) return [];
  const messages = await fetchInboxFromAPI(mb.email);
  const tagged = messages.map(m => ({ ...m, mailboxId }));
  cachedMessages[mailboxId] = tagged;
  return tagged;
}

export function getInbox(mailboxId: string): TempMessage[] {
  return cachedMessages[mailboxId] || [];
}

export async function getFullMessage(uid: number, mailboxId: string): Promise<TempMessage | null> {
  // Determine domain from the mailbox email
  const mb = getMailbox(mailboxId);
  const domain = mb?.email?.includes('@') ? mb.email.split('@')[1] : undefined;
  const msg = await fetchMessageFromAPI(uid, domain);
  if (msg) {
    msg.mailboxId = mailboxId;
    const cached = cachedMessages[mailboxId];
    if (cached) {
      const idx = cached.findIndex(m => m.uid === uid);
      if (idx !== -1) cached[idx] = { ...cached[idx], ...msg, isRead: true };
    }
  }
  return msg;
}

export async function deleteMessage(uid: number, mailboxId: string): Promise<boolean> {
  // Determine domain from the mailbox email
  const mb = getMailbox(mailboxId);
  const domain = mb?.email?.includes('@') ? mb.email.split('@')[1] : undefined;
  const ok = await deleteMessageFromAPI(uid, domain);
  if (ok && cachedMessages[mailboxId]) {
    cachedMessages[mailboxId] = cachedMessages[mailboxId].filter(m => m.uid !== uid);
  }
  return ok;
}

/**
 * Clears all messages for a specific mailbox from IMAP.
 */
export async function clearMailboxMessages(mailboxId: string): Promise<number> {
  const mb = getMailbox(mailboxId);
  if (!mb) return 0;
  const count = await clearInboxFromAPI(mb.email);
  cachedMessages[mailboxId] = [];
  return count;
}

export function deleteMailbox(mailboxId: string): void {
  const mailboxes = loadMailboxes().filter(m => m.id !== mailboxId);
  saveMailboxes(mailboxes);
  delete cachedMessages[mailboxId];
}

export function getUnreadCount(mailboxId: string): number {
  return (cachedMessages[mailboxId] || []).filter(m => !m.isRead).length;
}

/**
 * Temp Mail Service — Connects to Mailcow via API proxy.
 *
 * Uses Vercel serverless functions at /api/mail/* which connect to
 * the Mailcow IMAP server. The catch-all inbox receives all emails
 * for *@servicehub-mail.cloud.
 *
 * Fallback: if the API is unavailable, simulates demo emails.
 */

import { getPrimaryDomain, getAdminConfig } from './domain-config';

// ─── Types ─────────────────────────────────────────────────────────

export interface TempMailbox {
  id: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired';
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
  uid?: number; // IMAP UID for fetching full message
}

export type ExpiryOption = 10 | 30 | 60 | 1440; // minutes

// ─── Config ────────────────────────────────────────────────────────

function getDomain(): string {
  return getPrimaryDomain();
}

function getMaxMailboxes(): number {
  return getAdminConfig().maxMailboxes || 5;
}

// Rate-limit: max 5 mailbox creations per 10 minutes
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

// ─── In-Memory State ──────────────────────────────────────────────

let mailboxes: TempMailbox[] = [];
let cachedMessages: Record<string, TempMessage[]> = {}; // mailboxId -> messages
let creationTimestamps: number[] = [];

// ─── Helpers ───────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function generateEmailAddress(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${prefix}@${getDomain()}`;
}

function checkRateLimit(): boolean {
  const now = Date.now();
  creationTimestamps = creationTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  return creationTimestamps.length < RATE_LIMIT_MAX;
}

// ─── IMAP API Calls ───────────────────────────────────────────────

/**
 * Fetches inbox from the IMAP API endpoint.
 * Falls back to empty array if API is unavailable.
 */
async function fetchInboxFromAPI(address: string): Promise<TempMessage[]> {
  try {
    const res = await fetch(`/api/mail/inbox?address=${encodeURIComponent(address)}`);
    if (!res.ok) {
      console.warn('IMAP API returned', res.status);
      return [];
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      return data.messages.map((msg: any) => ({
        id: String(msg.uid),
        mailboxId: '', // filled by caller
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
  } catch (err) {
    console.warn('IMAP API unavailable:', err);
    return [];
  }
}

/**
 * Fetches a full message from the IMAP API endpoint.
 */
async function fetchMessageFromAPI(uid: number): Promise<TempMessage | null> {
  try {
    const res = await fetch(`/api/mail/message?uid=${uid}`);
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

// ─── Public API ────────────────────────────────────────────────────

export function createMailbox(expiryMinutes: ExpiryOption = 30): {
  success: boolean;
  mailbox?: TempMailbox;
  error?: string;
} {
  if (!checkRateLimit()) {
    return { success: false, error: 'Rate limit exceeded. Please wait before creating a new mailbox.' };
  }

  const maxMb = getMaxMailboxes();
  const activeMailboxes = mailboxes.filter(m => m.status === 'active' && Date.now() < m.expiresAt);
  if (activeMailboxes.length >= maxMb) {
    cleanupExpired();
    const stillActive = mailboxes.filter(m => m.status === 'active' && Date.now() < m.expiresAt);
    if (stillActive.length >= maxMb) {
      return { success: false, error: 'Maximum mailbox limit reached. Delete an existing mailbox first.' };
    }
  }

  const now = Date.now();
  const mailbox: TempMailbox = {
    id: generateId(),
    email: generateEmailAddress(),
    createdAt: now,
    expiresAt: now + expiryMinutes * 60 * 1000,
    status: 'active',
  };

  mailboxes.push(mailbox);
  creationTimestamps.push(now);
  cachedMessages[mailbox.id] = [];

  return { success: true, mailbox };
}

export function getMailbox(mailboxId: string): TempMailbox | null {
  const mb = mailboxes.find(m => m.id === mailboxId);
  if (!mb) return null;
  if (Date.now() > mb.expiresAt) {
    mb.status = 'expired';
  }
  return mb;
}

/**
 * Refreshes inbox by calling the IMAP API.
 */
export async function refreshInbox(mailboxId: string): Promise<TempMessage[]> {
  const mb = mailboxes.find(m => m.id === mailboxId);
  if (!mb) return [];

  const messages = await fetchInboxFromAPI(mb.email);
  // Tag messages with mailbox ID
  const tagged = messages.map(m => ({ ...m, mailboxId }));
  cachedMessages[mailboxId] = tagged;
  return tagged;
}

export function getInbox(mailboxId: string): TempMessage[] {
  return cachedMessages[mailboxId] || [];
}

/**
 * Gets full message content via IMAP API.
 */
export async function getFullMessage(uid: number, mailboxId: string): Promise<TempMessage | null> {
  const msg = await fetchMessageFromAPI(uid);
  if (msg) {
    msg.mailboxId = mailboxId;
    // Update cache
    const cached = cachedMessages[mailboxId];
    if (cached) {
      const idx = cached.findIndex(m => m.uid === uid);
      if (idx !== -1) {
        cached[idx] = { ...cached[idx], ...msg, isRead: true };
      }
    }
  }
  return msg;
}

export function getUnreadCount(mailboxId: string): number {
  return (cachedMessages[mailboxId] || []).filter(m => !m.isRead).length;
}

export function deleteMailbox(mailboxId: string): void {
  mailboxes = mailboxes.filter(m => m.id !== mailboxId);
  delete cachedMessages[mailboxId];
}

export function getAllMailboxes(): TempMailbox[] {
  cleanupExpired();
  return mailboxes.filter(m => m.status === 'active' && Date.now() < m.expiresAt);
}

export function cleanupExpired(): void {
  const now = Date.now();
  const expired = mailboxes.filter(m => now > m.expiresAt);
  expired.forEach(m => {
    m.status = 'expired';
    delete cachedMessages[m.id];
  });
  mailboxes = mailboxes.filter(m => m.status === 'active');
}

export const EXPIRY_OPTIONS: { label: string; value: ExpiryOption }[] = [
  { label: '10 minutes', value: 10 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 1440 },
];

export { getDomain };

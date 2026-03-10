/**
 * Temp Mail Service — Connects to Mailcow via IMAP API.
 *
 * - No expiration: mailboxes persist forever until manually deleted
 * - Mailbox list stored in localStorage for persistence
 * - Messages filtered by TO address (each temp email sees only its own)
 * - Delete individual messages or entire mailbox
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

function generateEmailAddress(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${prefix}@${getPrimaryDomain()}`;
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

async function deleteMessageFromAPI(uid: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/mail/delete?uid=${uid}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
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

// ─── Public API ────────────────────────────────────────────────────

export function createMailbox(): {
  success: boolean;
  mailbox?: TempMailbox;
  error?: string;
} {
  const mailbox: TempMailbox = {
    id: generateId(),
    email: generateEmailAddress(),
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
  const msg = await fetchMessageFromAPI(uid);
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
  const ok = await deleteMessageFromAPI(uid);
  if (ok && cachedMessages[mailboxId]) {
    cachedMessages[mailboxId] = cachedMessages[mailboxId].filter(m => m.uid !== uid);
  }
  return ok;
}

export function deleteMailbox(mailboxId: string): void {
  const mailboxes = loadMailboxes().filter(m => m.id !== mailboxId);
  saveMailboxes(mailboxes);
  delete cachedMessages[mailboxId];
}

export function getUnreadCount(mailboxId: string): number {
  return (cachedMessages[mailboxId] || []).filter(m => !m.isRead).length;
}

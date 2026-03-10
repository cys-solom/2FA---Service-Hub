/**
 * Temp Mail Service — Client-side demo mode.
 *
 * In production, this would call your backend API.
 * For demo / local use, everything runs in-memory.
 *
 * Architecture:
 *   - Each mailbox is identified by a unique ID & email address
 *   - Mailboxes auto-expire based on selected TTL
 *   - Messages are simulated for demo; in production they arrive via webhook
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
}

export type ExpiryOption = 10 | 30 | 60 | 1440; // minutes

// ─── Config (reads from admin settings) ───────────────────────────

function getDomain(): string {
  return getPrimaryDomain();
}

function getMaxMailboxes(): number {
  return getAdminConfig().maxMailboxes || 5;
}

function getMaxMessages(): number {
  return getAdminConfig().maxMessages || 50;
}

// Rate-limit: max 5 mailbox creations per 10 minutes
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

// ─── In-Memory Storage (demo mode) ────────────────────────────────

let mailboxes: TempMailbox[] = [];
let messages: TempMessage[] = [];
let creationTimestamps: number[] = [];
let demoIntervals: Record<string, ReturnType<typeof setInterval>> = {};

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

// ─── Demo email simulation ────────────────────────────────────────

const DEMO_SENDERS = [
  { name: 'Google', email: 'noreply@google.com' },
  { name: 'GitHub', email: 'noreply@github.com' },
  { name: 'ChatGPT', email: 'noreply@openai.com' },
  { name: 'Discord', email: 'noreply@discord.com' },
  { name: 'Adobe', email: 'noreply@adobe.com' },
  { name: 'Vercel', email: 'noreply@vercel.com' },
];

const DEMO_SUBJECTS = [
  { subject: 'Verify your email address', body: 'Please click the link below to verify your email address. This link will expire in 24 hours.' },
  { subject: 'Your verification code is 847291', body: 'Use the following code to complete your sign-up: <strong>847291</strong>. This code expires in 10 minutes.' },
  { subject: 'Welcome to the platform!', body: 'Thank you for signing up! Your account has been created successfully. Get started by completing your profile.' },
  { subject: 'Password reset request', body: 'We received a request to reset your password. If you did not make this request, you can ignore this email.' },
  { subject: 'Security alert: New sign-in', body: 'A new sign-in was detected on your account from a new device. If this was you, no action is needed.' },
  { subject: 'Two-factor authentication enabled', body: 'Two-factor authentication has been successfully enabled on your account. Keep your recovery codes safe.' },
];

function generateDemoMessage(mailboxId: string, email: string): TempMessage {
  const sender = DEMO_SENDERS[Math.floor(Math.random() * DEMO_SENDERS.length)];
  const template = DEMO_SUBJECTS[Math.floor(Math.random() * DEMO_SUBJECTS.length)];

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 30px; border-radius: 12px;">
        <h2 style="color: #e2e8f0; margin-bottom: 20px;">${template.subject}</h2>
        <p style="color: #a0aec0; line-height: 1.6;">${template.body}</p>
        <hr style="border: none; border-top: 1px solid #2d2d44; margin: 20px 0;" />
        <p style="color: #718096; font-size: 12px;">
          This email was sent to ${email}. If you did not request this, please ignore it.
        </p>
      </div>
    </div>
  `;

  return {
    id: generateId(),
    mailboxId,
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: template.subject,
    textBody: template.body.replace(/<[^>]*>/g, ''),
    htmlBody,
    snippet: template.body.replace(/<[^>]*>/g, '').slice(0, 80) + '…',
    receivedAt: Date.now(),
    isRead: false,
  };
}

function startDemoSimulation(mailboxId: string, email: string) {
  // Send a "welcome" message immediately
  const welcome: TempMessage = {
    id: generateId(),
    mailboxId,
    from: `Service Hub <system@${getDomain()}>`,
    to: email,
    subject: 'Your temporary inbox is ready!',
    textBody: `Your temporary email address ${email} is now active. Any emails sent to this address will appear here.`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; padding: 30px; border-radius: 12px;">
          <h2 style="color: #c4b5fd;">✉️ Inbox Ready</h2>
          <p style="color: #a0aec0; line-height: 1.6;">
            Your temporary email address <strong style="color: #e2e8f0;">${email}</strong> is now active.
          </p>
          <p style="color: #a0aec0; line-height: 1.6;">
            Any emails sent to this address will appear in your inbox automatically.
          </p>
          <div style="background: #2d2d44; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="color: #c4b5fd; font-size: 13px; margin: 0;">
              💡 This is a demo mode. In production, real emails would arrive via your mail server.
            </p>
          </div>
        </div>
      </div>
    `,
    snippet: `Your temporary email address ${email} is now active…`,
    receivedAt: Date.now(),
    isRead: false,
  };
  messages.push(welcome);

  // Simulate random incoming emails every 15-45 seconds
  const interval = setInterval(() => {
    const mailbox = mailboxes.find(m => m.id === mailboxId);
    if (!mailbox || mailbox.status === 'expired' || Date.now() > mailbox.expiresAt) {
      clearInterval(interval);
      delete demoIntervals[mailboxId];
      return;
    }

    const mbMessages = messages.filter(m => m.mailboxId === mailboxId);
    if (mbMessages.length < getMaxMessages()) {
      messages.push(generateDemoMessage(mailboxId, email));
    }
  }, 15000 + Math.random() * 30000);

  demoIntervals[mailboxId] = interval;
}

// ─── Public API ────────────────────────────────────────────────────

export function createMailbox(expiryMinutes: ExpiryOption = 30): {
  success: boolean;
  mailbox?: TempMailbox;
  error?: string;
} {
  // Rate limit check
  if (!checkRateLimit()) {
    return { success: false, error: 'Rate limit exceeded. Please wait before creating a new mailbox.' };
  }

  // Check max mailboxes
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

  // Start demo email simulation
  startDemoSimulation(mailbox.id, mailbox.email);

  return { success: true, mailbox };
}

export function getMailbox(mailboxId: string): TempMailbox | null {
  const mb = mailboxes.find(m => m.id === mailboxId);
  if (!mb) return null;
  // Check expiry
  if (Date.now() > mb.expiresAt) {
    mb.status = 'expired';
  }
  return mb;
}

export function getInbox(mailboxId: string): TempMessage[] {
  return messages
    .filter(m => m.mailboxId === mailboxId)
    .sort((a, b) => b.receivedAt - a.receivedAt);
}

export function getMessage(messageId: string): TempMessage | null {
  const msg = messages.find(m => m.id === messageId);
  if (msg) msg.isRead = true;
  return msg || null;
}

export function getUnreadCount(mailboxId: string): number {
  return messages.filter(m => m.mailboxId === mailboxId && !m.isRead).length;
}

export function deleteMailbox(mailboxId: string): void {
  // Stop demo simulation
  if (demoIntervals[mailboxId]) {
    clearInterval(demoIntervals[mailboxId]);
    delete demoIntervals[mailboxId];
  }
  mailboxes = mailboxes.filter(m => m.id !== mailboxId);
  messages = messages.filter(m => m.mailboxId !== mailboxId);
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
    if (demoIntervals[m.id]) {
      clearInterval(demoIntervals[m.id]);
      delete demoIntervals[m.id];
    }
  });
  // Remove expired mailboxes and their messages
  const expiredIds = new Set(expired.map(m => m.id));
  messages = messages.filter(m => !expiredIds.has(m.mailboxId));
  mailboxes = mailboxes.filter(m => m.status === 'active');
}

export const EXPIRY_OPTIONS: { label: string; value: ExpiryOption }[] = [
  { label: '10 minutes', value: 10 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '24 hours', value: 1440 },
];

export { getDomain, getMaxMailboxes, getMaxMessages };

/**
 * IMAP Helper — shared connection logic for Vercel serverless functions.
 *
 * Connects to the Mailcow IMAP server, runs a callback, then disconnects.
 * Uses the catch-all approach: all emails to *@domain go to one inbox.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const IMAP_CONFIG = {
  host: process.env.IMAP_HOST || 'mail.servicehub-mail.cloud',
  port: parseInt(process.env.IMAP_PORT || '993', 10),
  secure: true,
  auth: {
    user: process.env.IMAP_USER || 'inbox@servicehub-mail.cloud',
    pass: process.env.IMAP_PASS || '',
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: false,
};

/**
 * Executes a callback with an authenticated IMAP connection.
 */
async function withImap(callback) {
  const client = new ImapFlow(IMAP_CONFIG);
  try {
    await client.connect();
    const result = await callback(client);
    await client.logout();
    return result;
  } catch (error) {
    try { await client.logout(); } catch { /* ignore */ }
    throw error;
  }
}

/**
 * Fetches emails for a specific recipient address from INBOX.
 * Uses UID-based operations throughout to ensure correct message identification.
 */
async function fetchEmailsForAddress(address, limit = 20) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages = [];

      // Search by TO — returns sequence numbers
      const seqNumbers = await client.search({ to: address });

      if (!seqNumbers || seqNumbers.length === 0) {
        return [];
      }

      // Get the most recent ones (last N sequence numbers)
      const recentSeqs = seqNumbers.slice(-limit);

      // Fetch all matching messages in one call using sequence range
      const range = recentSeqs.join(',');
      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
      })) {
        if (msg && msg.envelope) {
          // Filter: only include if TO matches our address
          const toAddresses = msg.envelope.to || [];
          const matchesTo = toAddresses.some(
            t => t.address && t.address.toLowerCase() === address.toLowerCase()
          );
          if (!matchesTo) continue;

          messages.push({
            uid: msg.uid,
            subject: msg.envelope.subject || '(No subject)',
            from: msg.envelope.from && msg.envelope.from[0]
              ? `${msg.envelope.from[0].name || ''} <${msg.envelope.from[0].address || ''}>`
              : 'Unknown',
            to: address,
            date: msg.envelope.date ? new Date(msg.envelope.date).getTime() : Date.now(),
            isRead: msg.flags ? msg.flags.has('\\Seen') : false,
            size: msg.size || 0,
          });
        }
      }

      return messages.sort((a, b) => b.date - a.date);
    } finally {
      lock.release();
    }
  });
}

/**
 * Fetches a full email message by UID including body content.
 * Uses UID-based fetch to ensure the correct message is returned.
 */
async function fetchMessageByUid(uid) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Use UID-based fetch (3rd arg { uid: true })
      let msg = null;
      for await (const m of client.fetch(String(uid), {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      }, { uid: true })) {
        msg = m;
        break;
      }

      if (!msg || !msg.source) return null;

      // Mark as seen using UID
      try {
        await client.messageFlagsAdd({ uid: uid }, ['\\Seen'], { uid: true });
      } catch { /* ignore flag errors */ }

      // Parse the raw email source
      const parsed = await simpleParser(msg.source);

      // Extract body — try multiple sources
      let textBody = parsed.text || '';
      let htmlBody = parsed.html || '';

      // Some emails have content in textContent or nested parts
      if (!textBody && !htmlBody) {
        // Try attachments (some parsers put inline content here)
        if (parsed.attachments && parsed.attachments.length > 0) {
          for (const att of parsed.attachments) {
            if (att.contentType && att.contentType.includes('text/html') && att.content) {
              htmlBody = att.content.toString('utf-8');
              break;
            }
            if (att.contentType && att.contentType.includes('text/plain') && att.content) {
              textBody = att.content.toString('utf-8');
            }
          }
        }
      }

      // Last resort: extract raw text from HTML
      if (!textBody && htmlBody) {
        textBody = htmlBody
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      return {
        uid: msg.uid,
        subject: parsed.subject || msg.envelope?.subject || '(No subject)',
        from: parsed.from ? parsed.from.text : 'Unknown',
        to: parsed.to ? parsed.to.text : '',
        date: parsed.date ? parsed.date.getTime() : Date.now(),
        textBody,
        htmlBody,
        isRead: true,
      };
    } finally {
      lock.release();
    }
  });
}

/**
 * Deletes a specific message by UID.
 */
async function deleteMessageByUid(uid) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageDelete({ uid: uid }, { uid: true });
      return true;
    } finally {
      lock.release();
    }
  });
}

/**
 * Deletes ALL messages in the INBOX (admin purge).
 */
async function purgeAllMessages() {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const all = await client.search({ all: true });
      if (all && all.length > 0) {
        await client.messageDelete({ seq: all.join(',') });
      }
      return all ? all.length : 0;
    } finally {
      lock.release();
    }
  });
}

/**
 * Deletes ALL messages for a specific TO address.
 */
async function deleteMessagesForAddress(address) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const results = await client.search({ to: address });
      let count = 0;
      if (results && results.length > 0) {
        for (const seq of results) {
          try {
            // Fetch UID first, then delete by UID
            for await (const msg of client.fetch(String(seq), { uid: true })) {
              await client.messageDelete({ uid: msg.uid }, { uid: true });
              count++;
            }
          } catch { /* skip */ }
        }
      }
      return count;
    } finally {
      lock.release();
    }
  });
}

/**
 * Deletes messages older than N days from INBOX.
 */
async function purgeOldMessages(days = 30) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const results = await client.search({ before: cutoff });
      let count = 0;
      if (results && results.length > 0) {
        for (const seq of results) {
          try {
            for await (const msg of client.fetch(String(seq), { uid: true })) {
              await client.messageDelete({ uid: msg.uid }, { uid: true });
              count++;
            }
          } catch { /* skip */ }
        }
      }
      return count;
    } finally {
      lock.release();
    }
  });
}

export { withImap, fetchEmailsForAddress, fetchMessageByUid, deleteMessageByUid, deleteMessagesForAddress, purgeAllMessages, purgeOldMessages, IMAP_CONFIG };

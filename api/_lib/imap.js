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
    rejectUnauthorized: false, // Allow Mailcow self-signed certs
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
 * Strictly filters by TO header — only returns emails sent to this address.
 */
async function fetchEmailsForAddress(address, limit = 20) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages = [];

      // Search ONLY by TO — each temp address sees only its own messages
      const searchResults = await client.search({ to: address });

      if (!searchResults || searchResults.length === 0) {
        return [];
      }

      // Get the most recent ones
      const uids = searchResults.slice(-limit);

      for (const uid of uids) {
        try {
          const msg = await client.fetchOne(uid, {
            uid: true,
            envelope: true,
            flags: true,
            size: true,
          });

          if (msg && msg.envelope) {
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
        } catch {
          // Skip problematic messages
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
 */
async function fetchMessageByUid(uid) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const msg = await client.fetchOne(uid, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      });

      if (!msg) return null;

      // Mark as seen
      await client.messageFlagsAdd(uid, ['\\Seen']);

      // Parse the raw email source
      const parsed = await simpleParser(msg.source);

      // Extract text body — try multiple sources
      let textBody = parsed.text || '';
      let htmlBody = parsed.html || '';

      // Some emails have content in attachments (inline)
      if (!textBody && !htmlBody && parsed.attachments && parsed.attachments.length > 0) {
        for (const att of parsed.attachments) {
          if (att.contentType === 'text/html' && att.content) {
            htmlBody = att.content.toString('utf-8');
            break;
          }
          if (att.contentType === 'text/plain' && att.content) {
            textBody = att.content.toString('utf-8');
          }
        }
      }

      // If we still have no text but have HTML, extract text from HTML
      if (!textBody && htmlBody) {
        textBody = htmlBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
      }

      return {
        uid: msg.uid,
        subject: parsed.subject || '(No subject)',
        from: parsed.from ? parsed.from.text : 'Unknown',
        to: parsed.to ? parsed.to.text : '',
        date: parsed.date ? parsed.date.getTime() : Date.now(),
        textBody: textBody,
        htmlBody: htmlBody,
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
      await client.messageDelete(uid);
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
        for (const uid of all) {
          try {
            await client.messageDelete(uid);
          } catch { /* skip */ }
        }
      }
      return all ? all.length : 0;
    } finally {
      lock.release();
    }
  });
}

export { withImap, fetchEmailsForAddress, fetchMessageByUid, deleteMessageByUid, deleteMessagesForAddress, purgeAllMessages, purgeOldMessages, IMAP_CONFIG };

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
        for (const uid of results) {
          try { await client.messageDelete(uid); count++; } catch { /* skip */ }
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
        for (const uid of results) {
          try { await client.messageDelete(uid); count++; } catch { /* skip */ }
        }
      }
      return count;
    } finally {
      lock.release();
    }
  });
}

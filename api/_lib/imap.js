/**
 * IMAP Helper — shared connection logic for Vercel serverless functions.
 *
 * Connects to the Mailcow IMAP server, runs a callback, then disconnects.
 * Uses the catch-all approach: all emails to *@domain go to one inbox.
 */

const { ImapFlow } = require('imapflow');

const IMAP_CONFIG = {
  host: process.env.IMAP_HOST || 'mail.servicehub-mail.cloud',
  port: parseInt(process.env.IMAP_PORT || '993', 10),
  secure: true,
  auth: {
    user: process.env.IMAP_USER || 'inbox@servicehub-mail.cloud',
    pass: process.env.IMAP_PASS || '',
  },
  logger: false,
};

/**
 * Executes a callback with an authenticated IMAP connection.
 * Automatically handles connect/disconnect.
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
 * Uses IMAP SEARCH to filter by the TO header.
 */
async function fetchEmailsForAddress(address, limit = 20) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const messages = [];

      // Search for emails sent TO this specific address
      const searchResults = await client.search({
        to: address,
      });

      if (!searchResults || searchResults.length === 0) {
        return [];
      }

      // Get the most recent ones (last N)
      const uids = searchResults.slice(-limit);

      for (const uid of uids) {
        try {
          const msg = await client.fetchOne(uid, {
            uid: true,
            envelope: true,
            bodyStructure: true,
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

      // Sort newest first
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
      const { simpleParser } = require('mailparser');
      const parsed = await simpleParser(msg.source);

      return {
        uid: msg.uid,
        subject: parsed.subject || '(No subject)',
        from: parsed.from ? parsed.from.text : 'Unknown',
        to: parsed.to ? parsed.to.text : '',
        date: parsed.date ? parsed.date.getTime() : Date.now(),
        textBody: parsed.text || '',
        htmlBody: parsed.html || '',
        isRead: true,
      };
    } finally {
      lock.release();
    }
  });
}

module.exports = { withImap, fetchEmailsForAddress, fetchMessageByUid, IMAP_CONFIG };

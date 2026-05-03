/**
 * IMAP Helper — shared connection logic for Vercel serverless functions.
 *
 * Supports MULTIPLE domains, each with its own IMAP credentials.
 * Connects to the correct Mailcow IMAP server based on the email domain.
 * Uses the catch-all approach: all emails to *@domain go to one inbox.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// ─── Multi-domain IMAP Configs ──────────────────────────────────────

/**
 * Build the list of IMAP configs from environment variables.
 * Domain 1: IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS, MAIL_DOMAIN
 * Domain N: IMAP_HOST_N, IMAP_PORT_N, IMAP_USER_N, IMAP_PASS_N, MAIL_DOMAIN_N
 */
function buildImapConfigs() {
  const configs = [];

  // Domain 1 (primary)
  if (process.env.IMAP_HOST) {
    configs.push({
      domain: (process.env.MAIL_DOMAIN || 'servicehub-mail.cloud').toLowerCase(),
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '',
    });
  }

  // Domain 2..N
  for (let i = 2; i <= 10; i++) {
    const host = process.env[`IMAP_HOST_${i}`];
    const domain = process.env[`MAIL_DOMAIN_${i}`];
    if (host && domain) {
      configs.push({
        domain: domain.toLowerCase(),
        host,
        port: parseInt(process.env[`IMAP_PORT_${i}`] || '993', 10),
        user: process.env[`IMAP_USER_${i}`] || '',
        pass: process.env[`IMAP_PASS_${i}`] || '',
      });
    }
  }

  return configs;
}

/** Get the IMAP FlowConfig for a specific domain */
function getImapFlowConfig(domainName) {
  const configs = buildImapConfigs();
  const match = configs.find(c => c.domain === domainName?.toLowerCase());

  // Fallback to primary if no match
  const cfg = match || configs[0] || {
    host: 'mail.servicehub-mail.cloud',
    port: 993,
    user: 'inbox@servicehub-mail.cloud',
    pass: '',
  };

  return {
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
    logger: false,
  };
}

/** Returns the list of all allowed mail domains */
function getAllowedDomains() {
  // Prefer the explicit MAIL_DOMAINS list
  if (process.env.MAIL_DOMAINS) {
    return process.env.MAIL_DOMAINS.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  }
  // Fallback: derive from IMAP configs
  return buildImapConfigs().map(c => c.domain);
}

/** Extract the domain part from an email address */
function extractDomain(address) {
  if (!address || !address.includes('@')) return null;
  return address.split('@')[1].toLowerCase();
}

// Legacy single-config export (for backward compat)
const IMAP_CONFIG = getImapFlowConfig(process.env.MAIL_DOMAIN || 'servicehub-mail.cloud');

// ─── Connection Pool ───────────────────────────────────────────────

/**
 * IMAP Connection Pool — reuses connections within a 30-second TTL.
 * Each domain gets its own cached connection.
 * Connections are automatically cleaned up when stale.
 */
const connectionPool = new Map(); // domain → { client, lastUsed, connecting }
const POOL_TTL_MS = 30_000; // 30 seconds
const CONNECT_TIMEOUT_MS = 10_000; // 10 seconds

/** Clean up stale connections periodically */
function cleanupPool() {
  const now = Date.now();
  for (const [domain, entry] of connectionPool.entries()) {
    if (now - entry.lastUsed > POOL_TTL_MS && !entry.inUse) {
      try { entry.client.logout(); } catch { /* ignore */ }
      connectionPool.delete(domain);
    }
  }
}

// Run cleanup every 15 seconds
setInterval(cleanupPool, 15_000);

/** Get or create a pooled IMAP connection for a domain */
async function getPooledClient(domain) {
  const key = (domain || 'primary').toLowerCase();
  const existing = connectionPool.get(key);

  // Reuse existing connected client
  if (existing && existing.client && !existing.client.closed) {
    existing.lastUsed = Date.now();
    return existing.client;
  }

  // Clean up broken entry
  if (existing) {
    try { existing.client.logout(); } catch { /* ignore */ }
    connectionPool.delete(key);
  }

  // Create new connection with timeout
  const config = domain ? getImapFlowConfig(domain) : IMAP_CONFIG;
  const client = new ImapFlow(config);

  const connectPromise = client.connect();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`IMAP connect timeout for ${key}`)), CONNECT_TIMEOUT_MS)
  );

  await Promise.race([connectPromise, timeoutPromise]);

  connectionPool.set(key, {
    client,
    lastUsed: Date.now(),
    inUse: false,
  });

  // Auto-cleanup on connection close
  client.on('close', () => {
    connectionPool.delete(key);
  });

  return client;
}

// ─── Core IMAP Connection ──────────────────────────────────────────

/**
 * Executes a callback with an authenticated IMAP connection.
 * Uses connection pooling for better performance.
 * @param {Function} callback  — receives the ImapFlow client
 * @param {string}   [domain]  — optional domain to select the right IMAP server
 */
async function withImap(callback, domain) {
  const key = (domain || 'primary').toLowerCase();
  let client;
  try {
    client = await getPooledClient(domain);
    const entry = connectionPool.get(key);
    if (entry) entry.inUse = true;

    const result = await callback(client);

    if (entry) entry.inUse = false;
    return result;
  } catch (error) {
    // On error, remove the broken connection from pool
    const entry = connectionPool.get(key);
    if (entry) {
      entry.inUse = false;
      try { entry.client.logout(); } catch { /* ignore */ }
      connectionPool.delete(key);
    }
    throw error;
  }
}

/**
 * Fetches emails for a specific recipient address from INBOX.
 * Automatically connects to the correct IMAP server based on the email domain.
 */
async function fetchEmailsForAddress(address, limit = 20) {
  const domain = extractDomain(address);
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
  }, domain);
}

/**
 * Fetches a full email message by UID including body content.
 * Optionally provide the domain to connect to the correct server.
 */
async function fetchMessageByUid(uid, domain) {
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
  }, domain);
}

/**
 * Deletes a specific message by UID.
 * Optionally provide the domain to connect to the correct server.
 */
async function deleteMessageByUid(uid, domain) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageDelete({ uid: uid }, { uid: true });
      return true;
    } finally {
      lock.release();
    }
  }, domain);
}

/**
 * Deletes ALL messages in the INBOX (admin purge).
 * Purges from ALL configured IMAP servers.
 */
async function purgeAllMessages() {
  const configs = buildImapConfigs();
  let totalDeleted = 0;

  for (const cfg of configs) {
    try {
      const count = await withImap(async (client) => {
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
      }, cfg.domain);
      totalDeleted += count;
    } catch (err) {
      console.error(`Purge error for domain ${cfg.domain}:`, err.message);
    }
  }

  return totalDeleted;
}

/**
 * Deletes ALL messages for a specific TO address.
 */
async function deleteMessagesForAddress(address) {
  const domain = extractDomain(address);
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
  }, domain);
}

/**
 * Deletes messages older than N days from INBOX.
 * Cleans up ALL configured IMAP servers.
 */
async function purgeOldMessages(days = 30) {
  const configs = buildImapConfigs();
  let totalDeleted = 0;

  for (const cfg of configs) {
    try {
      const count = await withImap(async (client) => {
        const lock = await client.getMailboxLock('INBOX');
        try {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const results = await client.search({ before: cutoff });
          let deleted = 0;
          if (results && results.length > 0) {
            for (const seq of results) {
              try {
                for await (const msg of client.fetch(String(seq), { uid: true })) {
                  await client.messageDelete({ uid: msg.uid }, { uid: true });
                  deleted++;
                }
              } catch { /* skip */ }
            }
          }
          return deleted;
        } finally {
          lock.release();
        }
      }, cfg.domain);
      totalDeleted += count;
    } catch (err) {
      console.error(`Cleanup error for domain ${cfg.domain}:`, err.message);
    }
  }

  return totalDeleted;
}

export {
  withImap,
  fetchEmailsForAddress,
  fetchMessageByUid,
  deleteMessageByUid,
  deleteMessagesForAddress,
  purgeAllMessages,
  purgeOldMessages,
  getAllowedDomains,
  extractDomain,
  getImapFlowConfig,
  buildImapConfigs,
  IMAP_CONFIG,
};

/**
 * GET /api/mail/inbox?address=xxx@servicehub-mail.cloud
 *
 * Fetches the inbox for a specific temp email address via IMAP.
 * Returns a list of message summaries (not full bodies).
 */

const { fetchEmailsForAddress } = require('../_lib/imap');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing "address" query parameter' });
  }

  // Basic validation
  const domain = process.env.MAIL_DOMAIN || 'servicehub-mail.cloud';
  if (!address.endsWith(`@${domain}`)) {
    return res.status(400).json({ error: 'Invalid email domain' });
  }

  try {
    const messages = await fetchEmailsForAddress(address, 30);
    return res.status(200).json({
      success: true,
      address,
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('IMAP inbox error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch inbox',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

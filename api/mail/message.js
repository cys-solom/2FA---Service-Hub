/**
 * GET /api/mail/message?uid=123
 *
 * Fetches a full email message by UID via IMAP.
 * Returns subject, from, to, date, textBody, htmlBody.
 */

const { fetchMessageByUid } = require('../_lib/imap');

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

  const { uid } = req.query;

  if (!uid) {
    return res.status(400).json({ error: 'Missing "uid" query parameter' });
  }

  const uidNum = parseInt(uid, 10);
  if (isNaN(uidNum)) {
    return res.status(400).json({ error: 'Invalid UID' });
  }

  try {
    const message = await fetchMessageByUid(uidNum);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('IMAP message error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

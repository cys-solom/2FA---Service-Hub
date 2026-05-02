/**
 * GET /api/mail/message?uid=123&domain=gpt-servicehub.cloud
 *
 * Fetches a full email message by UID via IMAP.
 * Optional 'domain' param to target the correct IMAP server.
 */

import { fetchMessageByUid } from '../_lib/imap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, domain } = req.query;
  if (!uid) return res.status(400).json({ error: 'Missing "uid" query parameter' });

  const uidNum = parseInt(uid, 10);
  if (isNaN(uidNum)) return res.status(400).json({ error: 'Invalid UID' });

  try {
    const message = await fetchMessageByUid(uidNum, domain || undefined);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('IMAP message error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch message', details: error.message });
  }
}

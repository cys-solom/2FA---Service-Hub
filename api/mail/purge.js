/**
 * DELETE /api/mail/purge
 *
 * Admin: Deletes ALL messages from the IMAP inbox.
 */

import { purgeAllMessages } from '../_lib/imap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const count = await purgeAllMessages();
    return res.status(200).json({ success: true, deleted: count });
  } catch (error) {
    console.error('Purge error:', error.message);
    return res.status(500).json({ error: 'Failed to purge messages' });
  }
}

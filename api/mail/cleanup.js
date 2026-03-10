/**
 * DELETE /api/mail/cleanup?days=30
 *
 * Auto-cleanup: deletes messages older than N days.
 */

import { purgeOldMessages } from '../_lib/imap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const days = parseInt(req.query.days || '30', 10);

  try {
    const count = await purgeOldMessages(days);
    return res.status(200).json({ success: true, deleted: count, olderThanDays: days });
  } catch (error) {
    console.error('Cleanup error:', error.message);
    return res.status(500).json({ error: 'Failed to cleanup old messages' });
  }
}

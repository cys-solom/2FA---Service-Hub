/**
 * DELETE /api/mail/delete?uid=123
 *
 * Deletes a specific email message by UID from IMAP.
 */

import { deleteMessageByUid } from '../_lib/imap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'Missing "uid" parameter' });

  const uidNum = parseInt(uid, 10);
  if (isNaN(uidNum)) return res.status(400).json({ error: 'Invalid UID' });

  try {
    await deleteMessageByUid(uidNum);
    return res.status(200).json({ success: true, deleted: uidNum });
  } catch (error) {
    console.error('Delete error:', error.message);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}

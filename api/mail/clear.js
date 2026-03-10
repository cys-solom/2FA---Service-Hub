/**
 * DELETE /api/mail/clear?address=xxx@servicehub-mail.cloud
 *
 * Deletes all messages for a specific temp email address.
 */

import { deleteMessagesForAddress } from '../_lib/imap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Missing "address" parameter' });

  try {
    const count = await deleteMessagesForAddress(address);
    return res.status(200).json({ success: true, deleted: count, address });
  } catch (error) {
    console.error('Clear inbox error:', error.message);
    return res.status(500).json({ error: 'Failed to clear inbox' });
  }
}

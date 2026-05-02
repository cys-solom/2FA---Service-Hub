/**
 * GET /api/mail/inbox?address=xxx@domain.com
 *
 * Fetches the inbox for a specific temp email address via IMAP.
 * Supports multiple configured mail domains.
 */

import { fetchEmailsForAddress, getAllowedDomains, extractDomain } from '../_lib/imap.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing "address" query parameter' });
  }

  // Validate: domain must be in the list of allowed domains
  const emailDomain = extractDomain(address);
  const allowed = getAllowedDomains();
  if (!emailDomain || !allowed.includes(emailDomain)) {
    return res.status(400).json({
      error: 'Invalid email domain',
      allowedDomains: allowed,
    });
  }

  try {
    const messages = await fetchEmailsForAddress(address, 30);
    return res.status(200).json({ success: true, address, messages, count: messages.length });
  } catch (error) {
    console.error('IMAP inbox error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch inbox', details: error.message });
  }
}

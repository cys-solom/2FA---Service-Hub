/**
 * Local API Server for development.
 *
 * Runs the IMAP API routes on port 3001 so Vite can proxy to them.
 * Usage: node api-server.js
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import inboxHandler from './api/mail/inbox.js';
import messageHandler from './api/mail/message.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mount API routes
app.get('/api/mail/inbox', (req, res) => inboxHandler(req, res));
app.get('/api/mail/message', (req, res) => messageHandler(req, res));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    imap: {
      host: process.env.IMAP_HOST || 'not configured',
      user: process.env.IMAP_USER || 'not configured',
    },
    domain: process.env.MAIL_DOMAIN || 'servicehub-mail.cloud',
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log(`  ✉️  Mail API server running on http://localhost:${PORT}`);
  console.log(`  📮 IMAP: ${process.env.IMAP_USER}@${process.env.IMAP_HOST}`);
  console.log(`  📬 Domain: ${process.env.MAIL_DOMAIN || 'servicehub-mail.cloud'}`);
  console.log('');
});

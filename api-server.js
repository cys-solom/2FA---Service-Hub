/**
 * Local API Server for development.
 * Usage: node api-server.js
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import inboxHandler from './api/mail/inbox.js';
import messageHandler from './api/mail/message.js';
import deleteHandler from './api/mail/delete.js';
import purgeHandler from './api/mail/purge.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/mail/inbox', (req, res) => inboxHandler(req, res));
app.get('/api/mail/message', (req, res) => messageHandler(req, res));
app.delete('/api/mail/delete', (req, res) => deleteHandler(req, res));
app.delete('/api/mail/purge', (req, res) => purgeHandler(req, res));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    imap: { host: process.env.IMAP_HOST, user: process.env.IMAP_USER },
    domain: process.env.MAIL_DOMAIN || 'servicehub-mail.cloud',
  });
});

app.listen(PORT, () => {
  console.log(`\n  ✉️  Mail API running → http://localhost:${PORT}`);
  console.log(`  📮 IMAP: ${process.env.IMAP_USER}@${process.env.IMAP_HOST}`);
  console.log(`  📬 Domain: ${process.env.MAIL_DOMAIN}\n`);
});

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
import clearHandler from './api/mail/clear.js';
import purgeHandler from './api/mail/purge.js';
import cleanupHandler from './api/mail/cleanup.js';
import { getAllowedDomains, buildImapConfigs } from './api/_lib/imap.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/mail/inbox', (req, res) => inboxHandler(req, res));
app.get('/api/mail/message', (req, res) => messageHandler(req, res));
app.delete('/api/mail/delete', (req, res) => deleteHandler(req, res));
app.delete('/api/mail/clear', (req, res) => clearHandler(req, res));
app.delete('/api/mail/purge', (req, res) => purgeHandler(req, res));
app.delete('/api/mail/cleanup', (req, res) => cleanupHandler(req, res));

app.get('/api/health', (req, res) => {
  const configs = buildImapConfigs();
  res.json({
    status: 'ok',
    domains: getAllowedDomains(),
    imapServers: configs.map(c => ({ domain: c.domain, host: c.host, user: c.user })),
  });
});

app.listen(PORT, () => {
  const domains = getAllowedDomains();
  console.log(`\n  ✉️  Mail API running → http://localhost:${PORT}`);
  console.log(`  📬 Domains: ${domains.join(', ')}`);
  const configs = buildImapConfigs();
  configs.forEach((c, i) => {
    console.log(`  📮 [${i + 1}] ${c.domain} → ${c.user}@${c.host}`);
  });
  console.log('');
});

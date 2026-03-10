/**
 * Domain Configuration Service
 * 
 * Manages the email domains used by the Temp Mail feature.
 * Stores config in localStorage for persistence across sessions.
 * In production, this would be managed via a backend API.
 */

export interface DomainConfig {
  id: string;
  domain: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: number;
  // IMAP settings (for receiving mail)
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  imapTls?: boolean;
  // SMTP settings (optional, for sending)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpTls?: boolean;
}

export interface AdminConfig {
  domains: DomainConfig[];
  mailboxTTL: number;
  maxMailboxes: number;
  maxMessages: number;
  guestMode: boolean;
  adminEmail: string;
  adminPassword: string;
  createCode: string;
  serviceMailEmail: string;     // login for /service-mail page
  serviceMailPassword: string;
}

const ADMIN_SESSION_KEY = 'servicehub_admin_session';
const SMAIL_SESSION_KEY = 'servicehub_smail_session';

const STORAGE_KEY = 'servicehub_admin_config';

const DEFAULT_CONFIG: AdminConfig = {
  domains: [
    {
      id: 'default',
      domain: 'servicehub-mail.cloud',
      isActive: true,
      isPrimary: true,
      createdAt: Date.now(),
      imapHost: 'mail.servicehub-mail.cloud',
      imapPort: 993,
      imapUser: 'inbox@servicehub-mail.cloud',
      imapPassword: '',
      imapTls: true,
      smtpHost: 'mail.servicehub-mail.cloud',
      smtpPort: 587,
      smtpUser: 'inbox@servicehub-mail.cloud',
      smtpPassword: '',
      smtpTls: true,
    },
  ],
  mailboxTTL: 30,
  maxMailboxes: 5,
  maxMessages: 50,
  guestMode: true,
  adminEmail: 'admin@servicehub-mail.cloud',
  adminPassword: 'Fee2030@#',
  createCode: 'SH2030',
  serviceMailEmail: 'Inbox@servicehub-mail.cloud',
  serviceMailPassword: 'Box2030!@#',
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function getAdminConfig(): AdminConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AdminConfig;
      // Ensure at least one domain exists
      if (!parsed.domains || parsed.domains.length === 0) {
        parsed.domains = DEFAULT_CONFIG.domains;
      }
      // Migrate: fill in missing IMAP/SMTP fields on domains
      let needsSave = false;
      for (const d of parsed.domains) {
        if (d.imapHost === undefined) {
          d.imapHost = `mail.${d.domain}`;
          d.imapPort = 993;
          d.imapUser = `inbox@${d.domain}`;
          d.imapPassword = '';
          d.imapTls = true;
          d.smtpHost = `mail.${d.domain}`;
          d.smtpPort = 587;
          d.smtpUser = `inbox@${d.domain}`;
          d.smtpPassword = '';
          d.smtpTls = true;
          needsSave = true;
        }
      }
      // Migrate: fill in missing service mail fields
      if (!parsed.serviceMailEmail) {
        parsed.serviceMailEmail = DEFAULT_CONFIG.serviceMailEmail;
        parsed.serviceMailPassword = DEFAULT_CONFIG.serviceMailPassword;
        needsSave = true;
      }
      if (needsSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch {
    // If parsing fails, return default
  }
  return { ...DEFAULT_CONFIG };
}

export function saveAdminConfig(config: AdminConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getPrimaryDomain(): string {
  const config = getAdminConfig();
  const primary = config.domains.find(d => d.isPrimary && d.isActive);
  if (primary) return primary.domain;
  const firstActive = config.domains.find(d => d.isActive);
  if (firstActive) return firstActive.domain;
  return 'servicehub-mail.cloud';
}

export function getActiveDomains(): DomainConfig[] {
  return getAdminConfig().domains.filter(d => d.isActive);
}

export function addDomain(domain: string): { success: boolean; error?: string } {
  const config = getAdminConfig();

  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(domain)) {
    return { success: false, error: 'Invalid domain format' };
  }

  // Check duplicates
  if (config.domains.some(d => d.domain.toLowerCase() === domain.toLowerCase())) {
    return { success: false, error: 'Domain already exists' };
  }

  // Max 10 domains
  if (config.domains.length >= 10) {
    return { success: false, error: 'Maximum 10 domains allowed' };
  }

  config.domains.push({
    id: generateId(),
    domain: domain.toLowerCase(),
    isActive: true,
    isPrimary: config.domains.length === 0,
    createdAt: Date.now(),
  });

  saveAdminConfig(config);
  return { success: true };
}

export function removeDomain(id: string): { success: boolean; error?: string } {
  const config = getAdminConfig();
  const domain = config.domains.find(d => d.id === id);
  
  if (!domain) {
    return { success: false, error: 'Domain not found' };
  }

  if (domain.isPrimary && config.domains.filter(d => d.isActive).length > 1) {
    return { success: false, error: 'Cannot delete primary domain. Set another domain as primary first.' };
  }

  if (config.domains.length <= 1) {
    return { success: false, error: 'Cannot delete the last domain' };
  }

  config.domains = config.domains.filter(d => d.id !== id);
  
  // If removed domain was primary, set the first active one as primary
  if (domain.isPrimary && config.domains.length > 0) {
    const firstActive = config.domains.find(d => d.isActive) || config.domains[0];
    firstActive.isPrimary = true;
  }

  saveAdminConfig(config);
  return { success: true };
}

export function setPrimaryDomain(id: string): void {
  const config = getAdminConfig();
  config.domains.forEach(d => { d.isPrimary = d.id === id; });
  saveAdminConfig(config);
}

export function toggleDomainActive(id: string): void {
  const config = getAdminConfig();
  const domain = config.domains.find(d => d.id === id);
  if (domain) {
    domain.isActive = !domain.isActive;
    // Can't deactivate primary
    if (!domain.isActive && domain.isPrimary) {
      const otherActive = config.domains.find(d => d.id !== id && d.isActive);
      if (otherActive) {
        otherActive.isPrimary = true;
        domain.isPrimary = false;
      } else {
        domain.isActive = true; // Keep it active if no other active domain
        return;
      }
    }
    saveAdminConfig(config);
  }
}

export function updateDomainSettings(id: string, settings: Partial<DomainConfig>): void {
  const config = getAdminConfig();
  const domain = config.domains.find(d => d.id === id);
  if (domain) {
    Object.assign(domain, settings);
    saveAdminConfig(config);
  }
}

export function updateSettings(settings: Partial<Pick<AdminConfig, 'mailboxTTL' | 'maxMailboxes' | 'maxMessages' | 'guestMode' | 'adminEmail' | 'adminPassword' | 'createCode' | 'serviceMailEmail' | 'serviceMailPassword'>>): void {
  const config = getAdminConfig();
  if (settings.mailboxTTL !== undefined) config.mailboxTTL = settings.mailboxTTL;
  if (settings.maxMailboxes !== undefined) config.maxMailboxes = settings.maxMailboxes;
  if (settings.maxMessages !== undefined) config.maxMessages = settings.maxMessages;
  if (settings.guestMode !== undefined) config.guestMode = settings.guestMode;
  if (settings.adminEmail !== undefined) config.adminEmail = settings.adminEmail;
  if (settings.adminPassword !== undefined) config.adminPassword = settings.adminPassword;
  if (settings.createCode !== undefined) config.createCode = settings.createCode;
  if (settings.serviceMailEmail !== undefined) config.serviceMailEmail = settings.serviceMailEmail;
  if (settings.serviceMailPassword !== undefined) config.serviceMailPassword = settings.serviceMailPassword;
  saveAdminConfig(config);
}

// ─── Admin Authentication ──────────────────────────────────────────

export function loginAdmin(email: string, password: string): boolean {
  const config = getAdminConfig();
  if (email === config.adminEmail && password === config.adminPassword) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, ts: Date.now() }));
    return true;
  }
  return false;
}

export function isAdminLoggedIn(): boolean {
  try {
    const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!session) return false;
    const data = JSON.parse(session);
    // Session expires after 2 hours
    return Date.now() - data.ts < 2 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function validateCreateCode(code: string): boolean {
  const config = getAdminConfig();
  return code === config.createCode;
}

// ─── Service Mail Authentication ─────────────────────────────────────

export function loginServiceMail(email: string, password: string): boolean {
  const config = getAdminConfig();
  if (email === config.serviceMailEmail && password === config.serviceMailPassword) {
    sessionStorage.setItem(SMAIL_SESSION_KEY, JSON.stringify({ email, ts: Date.now() }));
    return true;
  }
  return false;
}

export function isServiceMailLoggedIn(): boolean {
  try {
    const session = sessionStorage.getItem(SMAIL_SESSION_KEY);
    if (!session) return false;
    const data = JSON.parse(session);
    return Date.now() - data.ts < 4 * 60 * 60 * 1000; // 4 hours
  } catch {
    return false;
  }
}

export function logoutServiceMail(): void {
  sessionStorage.removeItem(SMAIL_SESSION_KEY);
}

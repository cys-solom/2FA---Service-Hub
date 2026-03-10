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
}

export interface AdminConfig {
  domains: DomainConfig[];
  mailboxTTL: number;
  maxMailboxes: number;
  maxMessages: number;
  guestMode: boolean;
  adminEmail: string;
  adminPassword: string;
  createCode: string;         // secret code required to create mailboxes
}

const ADMIN_SESSION_KEY = 'servicehub_admin_session';

const STORAGE_KEY = 'servicehub_admin_config';

const DEFAULT_CONFIG: AdminConfig = {
  domains: [
    {
      id: 'default',
      domain: 'servicehub-mail.cloud',
      isActive: true,
      isPrimary: true,
      createdAt: Date.now(),
    },
  ],
  mailboxTTL: 30,
  maxMailboxes: 5,
  maxMessages: 50,
  guestMode: true,
  adminEmail: 'admin@servicehub-mail.cloud',
  adminPassword: 'Fee2030@#',
  createCode: 'SH2030',
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

export function updateSettings(settings: Partial<Pick<AdminConfig, 'mailboxTTL' | 'maxMailboxes' | 'maxMessages' | 'guestMode' | 'adminEmail' | 'adminPassword' | 'createCode'>>): void {
  const config = getAdminConfig();
  if (settings.mailboxTTL !== undefined) config.mailboxTTL = settings.mailboxTTL;
  if (settings.maxMailboxes !== undefined) config.maxMailboxes = settings.maxMailboxes;
  if (settings.maxMessages !== undefined) config.maxMessages = settings.maxMessages;
  if (settings.guestMode !== undefined) config.guestMode = settings.guestMode;
  if (settings.adminEmail !== undefined) config.adminEmail = settings.adminEmail;
  if (settings.adminPassword !== undefined) config.adminPassword = settings.adminPassword;
  if (settings.createCode !== undefined) config.createCode = settings.createCode;
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

/**
 * TOTP Utility Module
 * 
 * Handles all TOTP (Time-based One-Time Password) generation logic.
 * Implements RFC 6238 using the otplib v13 library.
 * 
 * Security: All operations run entirely client-side.
 * No secrets are ever transmitted, logged, or stored persistently.
 */

import { generateSync } from 'otplib';
import type { HashAlgorithm } from 'otplib';

/** Supported hash algorithms */
export type Algorithm = 'sha1' | 'sha256' | 'sha512';

/** Display-friendly algorithm names */
export const ALGORITHM_LABELS: Record<Algorithm, string> = {
  'sha1': 'SHA-1',
  'sha256': 'SHA-256',
  'sha512': 'SHA-512',
};

/** Configuration for TOTP generation */
export interface TOTPConfig {
  /** Number of digits in the code (6 or 8) */
  digits: 6 | 8;
  /** Time period in seconds (default: 30) */
  period: number;
  /** Hash algorithm */
  algorithm: Algorithm;
  /** Issuer name (optional, from otpauth URI) */
  issuer?: string;
  /** Account label (optional, from otpauth URI) */
  label?: string;
}

/** Default TOTP configuration */
export const DEFAULT_CONFIG: TOTPConfig = {
  digits: 6,
  period: 30,
  algorithm: 'sha1',
};

/** Result of parsing an otpauth URI */
export interface OTPAuthParams {
  secret: string;
  issuer?: string;
  label?: string;
  algorithm?: Algorithm;
  digits?: 6 | 8;
  period?: number;
}

/**
 * Validates whether a string is a valid Base32 encoded secret.
 * Base32 alphabet: A-Z, 2-7, with optional '=' padding.
 */
export function validateBase32(secret: string): boolean {
  if (!secret || typeof secret !== 'string') return false;
  const cleaned = secret.replace(/\s/g, '').toUpperCase();
  const base32Regex = /^[A-Z2-7]+=*$/;
  return cleaned.length >= 8 && base32Regex.test(cleaned);
}

/**
 * Cleans a Base32 secret by removing spaces and converting to uppercase.
 */
export function cleanSecret(secret: string): string {
  return secret.replace(/\s/g, '').toUpperCase();
}

/**
 * Generates a TOTP code for the given secret and configuration.
 * Fully RFC 6238 compliant via the otplib library.
 */
export function generateTOTP(secret: string, config: Partial<TOTPConfig> = {}): string {
  const { digits, period, algorithm } = { ...DEFAULT_CONFIG, ...config };
  const cleaned = cleanSecret(secret);

  if (!validateBase32(cleaned)) {
    throw new Error('Invalid Base32 secret key');
  }

  const result = generateSync({
    secret: cleaned,
    strategy: 'totp',
    algorithm: algorithm as HashAlgorithm,
    digits,
    period,
  });

  return result;
}

/**
 * Calculates the number of seconds remaining until the next code refresh.
 */
export function getTimeRemaining(period: number = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

/**
 * Parses an otpauth:// URI into its components.
 */
export function parseOtpAuthUri(uri: string): OTPAuthParams | null {
  try {
    if (!uri.startsWith('otpauth://totp/')) {
      return null;
    }

    const url = new URL(uri);
    const secret = url.searchParams.get('secret');

    if (!secret) return null;

    const pathLabel = decodeURIComponent(url.pathname.replace('/totp/', ''));
    
    let label = pathLabel;
    let issuer = url.searchParams.get('issuer') || undefined;

    if (pathLabel.includes(':')) {
      const [pathIssuer, account] = pathLabel.split(':', 2);
      if (!issuer) issuer = pathIssuer;
      label = account.trim();
    }

    const algParam = url.searchParams.get('algorithm')?.toLowerCase();
    const algorithm = (['sha1', 'sha256', 'sha512'].includes(algParam || '') 
      ? algParam 
      : undefined) as Algorithm | undefined;

    const digitsParam = url.searchParams.get('digits');
    const digits = digitsParam ? parseInt(digitsParam, 10) : undefined;

    const periodParam = url.searchParams.get('period');
    const period = periodParam ? parseInt(periodParam, 10) : undefined;

    return {
      secret,
      issuer,
      label,
      algorithm,
      digits: digits && [6, 8].includes(digits) ? (digits as 6 | 8) : undefined,
      period: period && period > 0 ? period : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a secret from the current URL.
 */
export function extractSecretFromURL(): { secret: string; params?: OTPAuthParams } | null {
  const url = new URL(window.location.href);

  // Check for otpauth URI in the 'uri' query parameter
  const otpauthUri = url.searchParams.get('uri');
  if (otpauthUri) {
    const params = parseOtpAuthUri(otpauthUri);
    if (params) {
      return { secret: params.secret, params };
    }
  }

  // Check for secret in query parameter
  const querySecret = url.searchParams.get('secret');
  if (querySecret && validateBase32(cleanSecret(querySecret))) {
    return { secret: cleanSecret(querySecret) };
  }

  // Check for secret in the URL path (handles /SECRET and /2fa/SECRET)
  let pathSecret = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  // If path starts with '2fa/', strip that prefix
  if (pathSecret.startsWith('2fa/')) {
    pathSecret = pathSecret.slice(4);
  }
  if (pathSecret && pathSecret !== '2fa' && pathSecret !== 'mail' && validateBase32(cleanSecret(pathSecret))) {
    return { secret: cleanSecret(pathSecret) };
  }

  return null;
}

/**
 * Cleans the URL by removing any secret data from the address bar.
 */
export function cleanURL(): void {
  window.history.replaceState({}, '', '/');
}

/**
 * Formats a TOTP code for display (e.g., "123 456" for 6-digit codes).
 */
export function formatCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}

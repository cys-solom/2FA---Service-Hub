/**
 * OTP Extractor — Auto-detect verification codes from email text.
 *
 * Matches common OTP patterns:
 *   - 4-8 digit numeric codes
 *   - Codes with hyphens (e.g., 123-456)
 *   - Codes preceded by keywords like "code", "OTP", "verification", "pin"
 *
 * Returns the most likely OTP code, or null if none found.
 */

interface ExtractedOTP {
  code: string;
  confidence: 'high' | 'medium' | 'low';
}

// Keywords that commonly precede OTP codes
const OTP_KEYWORDS = [
  'code', 'otp', 'pin', 'verification', 'verify', 'token',
  'password', 'passcode', 'security', 'confirm', 'authentication',
  'one-time', 'one time', '2fa', 'mfa',
  'الرمز', 'رمز', 'كود', 'التحقق',
];

// Pattern: keyword followed by optional punctuation then 4-8 digits
const KEYWORD_PATTERN = new RegExp(
  `(?:${OTP_KEYWORDS.join('|')})\\s*(?:is|:|=|\\s)\\s*([0-9]{4,8})`,
  'gi'
);

// Pattern: standalone 4-8 digit code (not part of a longer number)
const STANDALONE_PATTERN = /(?<!\d)(\d{4,8})(?!\d)/g;

// Pattern: hyphenated code like 123-456 or 1234-5678
const HYPHENATED_PATTERN = /(?<!\d)(\d{3,4}[-\s]\d{3,4})(?!\d)/g;

// Codes to exclude (common non-OTP numbers)
const EXCLUDE_PATTERNS = [
  /^20\d{2}$/, // years (2020-2029)
  /^(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/, // dates MMDD
  /^(?:1[0-2]|0?[1-9]):[0-5]\d$/, // times
  /^https?/i,
];

function isLikelyOTP(code: string): boolean {
  const clean = code.replace(/[-\s]/g, '');
  // Must be 4-8 digits
  if (!/^\d{4,8}$/.test(clean)) return false;
  // Exclude common non-OTP patterns
  return !EXCLUDE_PATTERNS.some(p => p.test(clean));
}

export function extractOTP(text: string): ExtractedOTP | null {
  if (!text) return null;

  // Strip HTML tags for cleaner matching
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');

  // 1. High confidence: keyword + code
  const keywordMatches: ExtractedOTP[] = [];
  let match: RegExpExecArray | null;

  KEYWORD_PATTERN.lastIndex = 0;
  while ((match = KEYWORD_PATTERN.exec(plain)) !== null) {
    const code = match[1];
    if (isLikelyOTP(code)) {
      keywordMatches.push({ code, confidence: 'high' });
    }
  }
  if (keywordMatches.length > 0) return keywordMatches[0];

  // 2. Medium confidence: hyphenated codes (123-456)
  HYPHENATED_PATTERN.lastIndex = 0;
  while ((match = HYPHENATED_PATTERN.exec(plain)) !== null) {
    const code = match[1].replace(/[-\s]/g, '');
    if (isLikelyOTP(code)) {
      return { code, confidence: 'medium' };
    }
  }

  // 3. Low confidence: standalone 4-8 digit numbers
  // Prefer 6-digit codes (most common OTP length)
  const standaloneMatches: ExtractedOTP[] = [];
  STANDALONE_PATTERN.lastIndex = 0;
  while ((match = STANDALONE_PATTERN.exec(plain)) !== null) {
    const code = match[1];
    if (isLikelyOTP(code)) {
      standaloneMatches.push({ code, confidence: 'low' });
    }
  }

  // Sort: prefer 6-digit, then 4-digit, then others
  standaloneMatches.sort((a, b) => {
    const aLen = a.code.length;
    const bLen = b.code.length;
    if (aLen === 6 && bLen !== 6) return -1;
    if (bLen === 6 && aLen !== 6) return 1;
    if (aLen === 4 && bLen !== 4) return -1;
    if (bLen === 4 && aLen !== 4) return 1;
    return 0;
  });

  return standaloneMatches[0] || null;
}

/**
 * Extract ALL OTP-like codes from text (for highlighting).
 */
export function extractAllOTPs(text: string): string[] {
  if (!text) return [];
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const codes = new Set<string>();

  // Keyword matches
  KEYWORD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = KEYWORD_PATTERN.exec(plain)) !== null) {
    if (isLikelyOTP(match[1])) codes.add(match[1]);
  }

  // Standalone 4-8 digit
  STANDALONE_PATTERN.lastIndex = 0;
  while ((match = STANDALONE_PATTERN.exec(plain)) !== null) {
    if (isLikelyOTP(match[1])) codes.add(match[1]);
  }

  return Array.from(codes);
}

/**
 * OTP Extractor — Auto-detect verification codes from email text.
 *
 * Enhanced detection for:
 *   - ChatGPT / OpenAI codes
 *   - Adobe verification codes
 *   - Grok / xAI codes
 *   - Google G-codes
 *   - Generic OTP patterns (4-8 digits)
 *   - Codes inside HTML tags like <b>123456</b>, <strong>, <code>, <span>
 *   - Hyphenated codes (123-456)
 *   - Codes on separate lines
 *   - Arabic keywords (رمز، كود، التحقق)
 *
 * Returns the most likely OTP code, or null if none found.
 */

interface ExtractedOTP {
  code: string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── High-confidence: Service-specific patterns ────────────────────

const SERVICE_PATTERNS: RegExp[] = [
  // OpenAI / ChatGPT: "Your login code is 123456" or "code: 123456"
  /login\s+code\s+(?:is\s+)?(\d{4,8})/i,
  /access\s+code\s*[:\s]\s*(\d{4,8})/i,
  // Adobe: "Use this code: 123456" or "your code is 123456" or "verification code: 123456"
  /verification\s+code\s*[:\sis]+(\d{4,8})/i,
  /security\s+code\s*[:\sis]+(\d{4,8})/i,
  /your\s+code\s*[:\sis]+(\d{4,8})/i,
  /the\s+code\s*[:\sis]+(\d{4,8})/i,
  /use\s+(?:this\s+)?code\s*[:\sis]+(\d{4,8})/i,
  /enter\s+(?:this\s+)?code\s*[:\sis]+(\d{4,8})/i,
  // Grok / xAI / X / Twitter
  /confirmation\s+code\s*[:\sis]+(\d{4,8})/i,
  // Google: "G-123456"
  /G-(\d{4,8})/,
  // Microsoft: "Security code: 123456" or "Use code 123456"
  /use\s+code\s+(\d{4,8})/i,
  // Generic: "123456 is your (verification|login|security) code"
  /(\d{4,8})\s+is\s+your\s+(?:verification|login|security|access|one[- ]time)?\s*code/i,
  // Generic: "code is 123456" or "code: 123456"
  /\bcode\s*[:=]\s*(\d{4,8})\b/i,
  /\bcode\s+is\s+(\d{4,8})\b/i,
  // OTP keyword patterns
  /\bOTP\s*[:\sis]+(\d{4,8})\b/i,
  /\bPIN\s*[:\sis]+(\d{4,8})\b/i,
  /\bpasscode\s*[:\sis]+(\d{4,8})\b/i,
  /\btoken\s*[:\sis]+(\d{4,8})\b/i,
  /\b(?:one[- ]time)\s+(?:password|code|passcode)\s*[:\sis]+(\d{4,8})\b/i,
  /\b2FA\s*[:\sis]+(\d{4,8})\b/i,
  /\bMFA\s*[:\sis]+(\d{4,8})\b/i,
  // Arabic
  /(?:رمز|كود|رقم)\s*(?:التحقق|الدخول|التأكيد|الأمان)?\s*[:\s]\s*(\d{4,8})/,
  /(\d{4,8})\s+(?:هو\s+)?(?:رمز|كود)/,
];

// ─── Medium-confidence: Codes inside HTML emphasis tags ─────────────

// Matches codes wrapped in <b>, <strong>, <code>, <span style="font-size:...">
const HTML_CODE_PATTERNS: RegExp[] = [
  /<b[^>]*>\s*(\d{4,8})\s*<\/b>/gi,
  /<strong[^>]*>\s*(\d{4,8})\s*<\/strong>/gi,
  /<code[^>]*>\s*(\d{4,8})\s*<\/code>/gi,
  // Large/bold styled span (common in email templates)
  /<span[^>]*(?:font-size|font-weight|letter-spacing)[^>]*>\s*(\d{4,8})\s*<\/span>/gi,
  // Codes inside <td> with large font (email templates)
  /<td[^>]*(?:font-size:\s*(?:2[0-9]|3[0-9]|4[0-9]))[^>]*>\s*(\d{4,8})\s*<\/td>/gi,
  // Codes inside <div> with specific styling
  /<div[^>]*(?:font-size|letter-spacing)[^>]*>\s*(\d{4,8})\s*<\/div>/gi,
  // Codes with letter-spacing (very common for OTPs in email templates)
  /letter-spacing[^>]*>\s*(\d{4,8})\s*</gi,
];

// ─── Hyphenated codes ──────────────────────────────────────────────

const HYPHENATED_PATTERN = /(?<!\d)(\d{3,4}[-\s]\d{3,4})(?!\d)/g;

// ─── Standalone digit patterns ─────────────────────────────────────

const STANDALONE_PATTERN = /(?<!\d)(\d{4,8})(?!\d)/g;

// ─── Exclude non-OTP numbers ───────────────────────────────────────

const EXCLUDE_PATTERNS = [
  /^20[2-3]\d$/,           // years 2020-2039
  /^19\d{2}$/,             // years 1900s
  /^0{3,}$/,               // all zeros
  /^1{3,}$/,               // all ones
  /^1234\d*$/,             // sequential
  /^4321\d*$/,             // reverse sequential
  /^(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/, // dates MMDD
];

function isLikelyOTP(code: string): boolean {
  const clean = code.replace(/[-\s]/g, '');
  if (!/^\d{4,8}$/.test(clean)) return false;
  return !EXCLUDE_PATTERNS.some(p => p.test(clean));
}

// ─── HTML → Plain text (thorough) ──────────────────────────────────

function stripHtml(html: string): string {
  return html
    // Remove <style> blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    // Remove <script> blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Replace <br>, <p>, <div>, <tr>, <li> with newlines
    .replace(/<(?:br|\/p|\/div|\/tr|\/li|\/h[1-6])[^>]*>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main extractor ────────────────────────────────────────────────

export function extractOTP(text: string): ExtractedOTP | null {
  if (!text) return null;

  const rawHtml = text;
  const plain = stripHtml(text);

  // 1. HIGH: Service-specific patterns on plain text
  for (const pattern of SERVICE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(plain);
    if (match && match[1] && isLikelyOTP(match[1])) {
      return { code: match[1], confidence: 'high' };
    }
  }

  // 2. HIGH: Codes inside HTML emphasis tags (before stripping HTML)
  for (const pattern of HTML_CODE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(rawHtml);
    if (match && match[1] && isLikelyOTP(match[1])) {
      return { code: match[1], confidence: 'high' };
    }
  }

  // 3. MEDIUM: Hyphenated codes (123-456)
  HYPHENATED_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HYPHENATED_PATTERN.exec(plain)) !== null) {
    const code = match[1].replace(/[-\s]/g, '');
    if (isLikelyOTP(code)) {
      return { code, confidence: 'medium' };
    }
  }

  // 4. MEDIUM: Code on its own line (common in emails)
  const lines = plain.split(/\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    // Line that is ONLY a 4-8 digit number (very likely OTP)
    if (/^\d{4,8}$/.test(trimmed) && isLikelyOTP(trimmed)) {
      return { code: trimmed, confidence: 'medium' };
    }
  }

  // 5. LOW: Standalone 4-8 digit numbers in text
  const standaloneMatches: ExtractedOTP[] = [];
  STANDALONE_PATTERN.lastIndex = 0;
  while ((match = STANDALONE_PATTERN.exec(plain)) !== null) {
    if (isLikelyOTP(match[1])) {
      standaloneMatches.push({ code: match[1], confidence: 'low' });
    }
  }

  // Prefer 6-digit (most common), then 8, then 4
  standaloneMatches.sort((a, b) => {
    const priority = (len: number) => len === 6 ? 0 : len === 8 ? 1 : len === 4 ? 2 : 3;
    return priority(a.code.length) - priority(b.code.length);
  });

  return standaloneMatches[0] || null;
}

/**
 * Extract ALL OTP-like codes from text (for highlighting).
 */
export function extractAllOTPs(text: string): string[] {
  if (!text) return [];
  const plain = stripHtml(text);
  const codes = new Set<string>();

  // Service patterns
  for (const pattern of SERVICE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(plain);
    if (match && match[1] && isLikelyOTP(match[1])) codes.add(match[1]);
  }

  // Standalone
  STANDALONE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STANDALONE_PATTERN.exec(plain)) !== null) {
    if (isLikelyOTP(match[1])) codes.add(match[1]);
  }

  return Array.from(codes);
}

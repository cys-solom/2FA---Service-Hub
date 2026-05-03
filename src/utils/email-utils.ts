/**
 * OTP Detection — Extracts OTP/verification codes from email subjects and bodies.
 * 
 * Enhanced patterns for:
 *   - ChatGPT / OpenAI: "Your login code is 482957"
 *   - Adobe: "Use this code: 739201" or "verification code: 123456"
 *   - Grok / xAI: "confirmation code: 123456"
 *   - Google: "G-739201"
 *   - Microsoft: "Security code: 123456"
 *   - Generic OTP / PIN / passcode patterns
 *   - Arabic keywords
 *   - Codes inside HTML <b>, <strong>, <code> tags
 *   - Codes on standalone lines
 */

// High-confidence: keyword-based patterns (order matters — most specific first)
const OTP_PATTERNS: RegExp[] = [
  // "login code is 123456" or "login code: 123456" (ChatGPT)
  /login\s+code\s+(?:is\s+)?(\d{4,8})/i,
  /access\s+code\s*[:\s]\s*(\d{4,8})/i,
  // "verification code: 123456" or "verification code is 123456" (Adobe, generic)
  /verification\s+code\s*[:\sis]+(\d{4,8})/i,
  /security\s+code\s*[:\sis]+(\d{4,8})/i,
  /confirmation\s+code\s*[:\sis]+(\d{4,8})/i,
  // "your code is 123456" / "your code: 123456" / "the code: 123456"
  /(?:your|the)\s+code\s*[:\sis]+(\d{4,8})/i,
  // "use this code: 123456" / "enter this code: 123456" / "use code 123456"
  /(?:use|enter)\s+(?:this\s+)?code\s*[:\sis]+(\d{4,8})/i,
  // "code is 123456" / "code: 123456" / "code = 123456"
  /\bcode\s*[:=]\s*(\d{4,8})\b/i,
  /\bcode\s+is\s+(\d{4,8})\b/i,
  // OTP / PIN / passcode / token
  /\bOTP\s*[:\sis]+(\d{4,8})\b/i,
  /\bPIN\s*[:\sis]+(\d{4,8})\b/i,
  /\bpasscode\s*[:\sis]+(\d{4,8})\b/i,
  /\btoken\s*[:\sis]+(\d{4,8})\b/i,
  /\b(?:one[- ]time)\s+(?:password|code)\s*[:\sis]+(\d{4,8})\b/i,
  /\b(?:2FA|MFA)\s*[:\sis]+(\d{4,8})\b/i,
  // "123456 is your code" / "123456 is your verification code"
  /(\d{4,8})\s+is\s+your\s+(?:\w+\s+)?code/i,
  // "Use 123456 to" / "Enter 123456 to"
  /(?:Use|Enter)\s+(\d{4,8})\s+(?:to|for|as)/i,
  // G-123456 (Google style)
  /G-(\d{4,8})/,
  // Arabic
  /(?:رمز|كود|رقم)\s*(?:التحقق|الدخول|التأكيد|الأمان)?\s*[:\s]\s*(\d{4,8})/,
  /(\d{4,8})\s+(?:هو\s+)?(?:رمز|كود)/,
  // Chinese
  /(?:验证码|码)[：:\s]*(\d{4,8})/,
];

// Codes inside HTML emphasis tags
const HTML_TAG_PATTERNS: RegExp[] = [
  /<b[^>]*>\s*(\d{4,8})\s*<\/b>/i,
  /<strong[^>]*>\s*(\d{4,8})\s*<\/strong>/i,
  /<code[^>]*>\s*(\d{4,8})\s*<\/code>/i,
  /<span[^>]*(?:font-size|font-weight|letter-spacing)[^>]*>\s*(\d{4,8})\s*<\/span>/i,
];

// Standalone 5-8 digit code (fallback — only used in subject)
const STANDALONE_SUBJECT = /\b(\d{5,8})\b/;

function stripHtmlQuick(text: string): string {
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractOTP(subject: string, textBody?: string): string | null {
  // 1. Try keyword patterns on subject (most reliable)
  for (const pattern of OTP_PATTERNS) {
    const match = subject.match(pattern);
    if (match && match[1]) return match[1];
  }

  // 2. Try body — scan first 2000 chars (was 500)
  if (textBody) {
    const bodySnippet = textBody.slice(0, 2000);

    // 2a. Check HTML emphasis tags BEFORE stripping (codes in <b>, <strong>, etc.)
    for (const pattern of HTML_TAG_PATTERNS) {
      const match = bodySnippet.match(pattern);
      if (match && match[1]) return match[1];
    }

    // 2b. Strip HTML and try keyword patterns
    const plainBody = stripHtmlQuick(bodySnippet);

    for (const pattern of OTP_PATTERNS) {
      const match = plainBody.match(pattern);
      if (match && match[1]) return match[1];
    }

    // 2c. Check for code on its own line
    const lines = plainBody.split(/[\n\r]+/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\d{4,8}$/.test(trimmed) && !/^20[2-3]\d$/.test(trimmed)) {
        return trimmed;
      }
    }
  }

  // 3. Fallback: standalone 5-8 digit in subject only
  const subjectMatch = subject.match(STANDALONE_SUBJECT);
  if (subjectMatch && subjectMatch[1] && !/^20[2-3]\d$/.test(subjectMatch[1])) {
    return subjectMatch[1];
  }

  return null;
}

/**
 * Auto-classification — Categorize emails by sender.
 */
export type EmailCategory = 'otp' | 'social' | 'shopping' | 'finance' | 'dev' | 'other';

interface CategoryInfo {
  id: EmailCategory;
  label: string;
  labelAr: string;
  color: string;
  icon: string; // emoji
}

export const CATEGORIES: Record<EmailCategory, CategoryInfo> = {
  otp: { id: 'otp', label: 'OTP', labelAr: 'رمز تحقق', color: 'emerald', icon: '🔑' },
  social: { id: 'social', label: 'Social', labelAr: 'اجتماعي', color: 'blue', icon: '💬' },
  shopping: { id: 'shopping', label: 'Shopping', labelAr: 'تسوق', color: 'amber', icon: '🛒' },
  finance: { id: 'finance', label: 'Finance', labelAr: 'مالي', color: 'green', icon: '💰' },
  dev: { id: 'dev', label: 'Developer', labelAr: 'مطور', color: 'violet', icon: '💻' },
  other: { id: 'other', label: 'Other', labelAr: 'أخرى', color: 'gray', icon: '📧' },
};

const SENDER_RULES: Array<{ pattern: RegExp; category: EmailCategory }> = [
  // Social
  { pattern: /facebook|meta\.com|fb\.com/i, category: 'social' },
  { pattern: /twitter|x\.com/i, category: 'social' },
  { pattern: /instagram/i, category: 'social' },
  { pattern: /linkedin/i, category: 'social' },
  { pattern: /discord/i, category: 'social' },
  { pattern: /telegram/i, category: 'social' },
  { pattern: /whatsapp/i, category: 'social' },
  { pattern: /snapchat/i, category: 'social' },
  { pattern: /tiktok/i, category: 'social' },
  { pattern: /reddit/i, category: 'social' },

  // Shopping
  { pattern: /amazon/i, category: 'shopping' },
  { pattern: /ebay/i, category: 'shopping' },
  { pattern: /aliexpress|alibaba/i, category: 'shopping' },
  { pattern: /shopify/i, category: 'shopping' },
  { pattern: /paypal/i, category: 'finance' },
  { pattern: /stripe/i, category: 'finance' },

  // Developer
  { pattern: /github/i, category: 'dev' },
  { pattern: /gitlab/i, category: 'dev' },
  { pattern: /bitbucket/i, category: 'dev' },
  { pattern: /vercel/i, category: 'dev' },
  { pattern: /netlify/i, category: 'dev' },
  { pattern: /heroku/i, category: 'dev' },
  { pattern: /digitalocean/i, category: 'dev' },
  { pattern: /cloudflare/i, category: 'dev' },
  { pattern: /npm/i, category: 'dev' },

  // Finance
  { pattern: /bank|مصرف/i, category: 'finance' },
  { pattern: /visa|mastercard/i, category: 'finance' },

  // Tech (often send OTPs)
  { pattern: /google|gmail/i, category: 'otp' },
  { pattern: /microsoft|outlook|hotmail/i, category: 'otp' },
  { pattern: /apple|icloud/i, category: 'otp' },
  { pattern: /adobe/i, category: 'otp' },
  { pattern: /chatgpt|openai/i, category: 'otp' },
  { pattern: /gemini/i, category: 'otp' },
];

export function classifyEmail(from: string, subject: string): EmailCategory {
  // Check if subject contains OTP patterns
  if (extractOTP(subject)) return 'otp';

  // Check sender rules
  const combined = `${from} ${subject}`;
  for (const rule of SENDER_RULES) {
    if (rule.pattern.test(combined)) return rule.category;
  }

  return 'other';
}

/**
 * Sound notification for new emails.
 */
let audioContext: AudioContext | null = null;

export function playNotificationSound(): void {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant notification tone
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108, audioContext.currentTime + 0.1); // C#6
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}

/**
 * Tab badge — update document title with unread count.
 */
const BASE_TITLE = 'Service Hub';

export function updateTabBadge(unreadCount: number): void {
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${BASE_TITLE}`;
  } else {
    document.title = BASE_TITLE;
  }
}

/**
 * OTP Detection — Extracts OTP/verification codes from email subjects and bodies.
 * 
 * Patterns detected:
 *   - "Your code is 482957"
 *   - "Verification: 739201"
 *   - "OTP: 1234"
 *   - "رمز التحقق: 567890"
 *   - Standalone 4-8 digit numbers
 */

const OTP_PATTERNS = [
  // "code is 123456", "code: 123456", "code 123456"
  /(?:code|码|رمز|كود)[\s:：is]*(\d{4,8})/i,
  // "OTP: 123456", "OTP is 123456"
  /(?:OTP|otp)[\s:：is]*(\d{4,8})/i,
  // "verification: 123456"
  /(?:verification|verify|تحقق)[\s:：]*(\d{4,8})/i,
  // "PIN: 1234"
  /(?:PIN|pin)[\s:：]*(\d{4,8})/i,
  // "123456 is your code"
  /(\d{4,8})\s+(?:is your|هو|est votre)/i,
  // "Use 123456 to"
  /(?:Use|Enter|استخدم)\s+(\d{4,8})\s/i,
  // G-123456 (Google style)
  /G-(\d{4,8})/,
  // Standalone code in subject (common pattern)
  /\b(\d{5,8})\b/,
];

export function extractOTP(subject: string, textBody?: string): string | null {
  // Try subject first (most reliable)
  for (const pattern of OTP_PATTERNS) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Try body (first 500 chars only)
  if (textBody) {
    const snippet = textBody.slice(0, 500);
    for (const pattern of OTP_PATTERNS.slice(0, -1)) { // Skip standalone pattern for body
      const match = snippet.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
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

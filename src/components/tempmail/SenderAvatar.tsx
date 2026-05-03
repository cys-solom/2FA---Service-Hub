/**
 * SenderAvatar — Shows branded sender logos for known services.
 *
 * Uses a curated map of known sender domains → brand colors + icons.
 * Falls back to Google Favicons, then gradient letter avatar.
 */

import { useState, useMemo } from 'react';

// ─── Known Brand Map ───────────────────────────────────────────────

interface BrandInfo {
  bg: string;       // tailwind gradient or solid bg
  letter: string;   // display letter/emoji
  color: string;    // text color class
}

/** Map sender email domains to brand visuals */
const BRAND_MAP: Record<string, BrandInfo> = {
  // ChatGPT / OpenAI
  'openai.com':          { bg: 'bg-[#10a37f]', letter: '✦', color: 'text-white' },
  'email.openai.com':    { bg: 'bg-[#10a37f]', letter: '✦', color: 'text-white' },
  'noreply.openai.com':  { bg: 'bg-[#10a37f]', letter: '✦', color: 'text-white' },
  // Adobe
  'adobe.com':           { bg: 'bg-[#FF0000]', letter: 'A', color: 'text-white' },
  'email.adobe.com':     { bg: 'bg-[#FF0000]', letter: 'A', color: 'text-white' },
  'adobeid-na1.services.adobe.com': { bg: 'bg-[#FF0000]', letter: 'A', color: 'text-white' },
  // Grok / xAI
  'x.ai':               { bg: 'bg-black', letter: '𝕏', color: 'text-white' },
  'xai.com':            { bg: 'bg-black', letter: '𝕏', color: 'text-white' },
  // X / Twitter
  'twitter.com':        { bg: 'bg-black', letter: '𝕏', color: 'text-white' },
  'x.com':              { bg: 'bg-black', letter: '𝕏', color: 'text-white' },
  'postmaster.twitter.com': { bg: 'bg-black', letter: '𝕏', color: 'text-white' },
  // Google
  'google.com':         { bg: 'bg-white', letter: 'G', color: 'text-[#4285F4]' },
  'accounts.google.com':{ bg: 'bg-white', letter: 'G', color: 'text-[#4285F4]' },
  'gmail.com':          { bg: 'bg-white', letter: 'G', color: 'text-[#4285F4]' },
  // Microsoft
  'microsoft.com':      { bg: 'bg-[#00A4EF]', letter: 'M', color: 'text-white' },
  'live.com':           { bg: 'bg-[#00A4EF]', letter: 'M', color: 'text-white' },
  'outlook.com':        { bg: 'bg-[#0078D4]', letter: 'O', color: 'text-white' },
  // GitHub
  'github.com':         { bg: 'bg-[#24292e]', letter: '⌥', color: 'text-white' },
  'noreply.github.com': { bg: 'bg-[#24292e]', letter: '⌥', color: 'text-white' },
  // Discord
  'discord.com':        { bg: 'bg-[#5865F2]', letter: 'D', color: 'text-white' },
  // Apple
  'apple.com':          { bg: 'bg-[#555]', letter: '', color: 'text-white' },
  'id.apple.com':       { bg: 'bg-[#555]', letter: '', color: 'text-white' },
  // Meta / Facebook
  'facebook.com':       { bg: 'bg-[#1877F2]', letter: 'f', color: 'text-white' },
  'facebookmail.com':   { bg: 'bg-[#1877F2]', letter: 'f', color: 'text-white' },
  'instagram.com':      { bg: 'bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]', letter: 'IG', color: 'text-white' },
  // Amazon
  'amazon.com':         { bg: 'bg-[#FF9900]', letter: 'a', color: 'text-[#232f3e]' },
  // PayPal
  'paypal.com':         { bg: 'bg-[#003087]', letter: 'P', color: 'text-white' },
  // LinkedIn
  'linkedin.com':       { bg: 'bg-[#0A66C2]', letter: 'in', color: 'text-white' },
  // Telegram
  'telegram.org':       { bg: 'bg-[#26A5E4]', letter: '✈', color: 'text-white' },
  // Vercel
  'vercel.com':         { bg: 'bg-black', letter: '▲', color: 'text-white' },
  // Cloudflare
  'cloudflare.com':     { bg: 'bg-[#F6821F]', letter: 'CF', color: 'text-white' },
  // Gemini
  'gemini.google.com':  { bg: 'bg-gradient-to-br from-[#4285F4] to-[#9B72CB]', letter: '✦', color: 'text-white' },
  // Stripe
  'stripe.com':         { bg: 'bg-[#635BFF]', letter: 'S', color: 'text-white' },
};

/**
 * Try to match sender domain to a known brand.
 * Checks exact domain, then parent domain (e.g. mail.google.com → google.com).
 */
function findBrand(domain: string): BrandInfo | null {
  if (BRAND_MAP[domain]) return BRAND_MAP[domain];
  // Try parent domain: "mail.openai.com" → "openai.com"
  const parts = domain.split('.');
  if (parts.length > 2) {
    const parent = parts.slice(-2).join('.');
    if (BRAND_MAP[parent]) return BRAND_MAP[parent];
  }
  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
];

function getAvatarColor(from: string): string {
  let hash = 0;
  for (let i = 0; i < from.length; i++) hash = from.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function extractDomain(from: string): string | null {
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/);
  if (emailMatch) {
    const parts = emailMatch[1].split('@');
    if (parts.length === 2) return parts[1].toLowerCase();
  }
  return null;
}

function senderName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  if (match) return match[1].replace(/"/g, '').trim();
  return from.split('@')[0];
}

function senderInitial(from: string): string {
  const name = senderName(from);
  return name.charAt(0).toUpperCase();
}

// ─── Component ─────────────────────────────────────────────────────

interface SenderAvatarProps {
  from: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function SenderAvatar({ from, size = 'sm', className = '' }: SenderAvatarProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const domain = useMemo(() => extractDomain(from), [from]);
  const brand = useMemo(() => domain ? findBrand(domain) : null, [domain]);

  const sizeClasses = size === 'md'
    ? 'w-9 h-9 rounded-xl shadow-lg'
    : 'w-8 h-8 rounded-lg shadow-sm';

  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';
  const brandTextSize = size === 'md' ? 'text-sm' : 'text-xs';

  // 1. Known brand → show brand avatar
  if (brand) {
    return (
      <div className={`${sizeClasses} ${brand.bg} flex items-center justify-center flex-shrink-0 border border-white/[0.06] ${className}`}>
        <span className={`${brand.color} ${brandTextSize} font-bold leading-none select-none`}>
          {brand.letter}
        </span>
      </div>
    );
  }

  // 2. Unknown domain → try favicon
  if (domain && !faviconFailed && !domain.includes('servicehub') && !domain.includes('gpt-servicehub')) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    return (
      <div className={`${sizeClasses} flex-shrink-0 relative overflow-hidden bg-white/[0.06] border border-white/[0.08] flex items-center justify-center ${className}`}>
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5 object-contain"
          onError={() => setFaviconFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // 3. Fallback → gradient letter avatar
  return (
    <div className={`${sizeClasses} bg-gradient-to-br ${getAvatarColor(from)} flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`text-white ${textSize} font-bold`}>{senderInitial(from)}</span>
    </div>
  );
}

export { senderName, senderInitial, getAvatarColor, extractDomain };

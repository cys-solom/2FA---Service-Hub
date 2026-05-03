/**
 * SenderAvatar — Shows real sender logos when available.
 *
 * Uses Google's favicon service to fetch real logos for known senders.
 * Falls back to a gradient letter avatar if the logo fails to load.
 */

import { useState, useMemo } from 'react';

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
  // Try to extract domain from "Name <email@domain.com>" or "email@domain.com"
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

interface SenderAvatarProps {
  from: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function SenderAvatar({ from, size = 'sm', className = '' }: SenderAvatarProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  const domain = useMemo(() => extractDomain(from), [from]);

  const sizeClasses = size === 'md'
    ? 'w-9 h-9 rounded-xl shadow-lg'
    : 'w-8 h-8 rounded-lg shadow-sm';

  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';

  // Try to get a logo from Google's favicon service
  const logoUrl = useMemo(() => {
    if (!domain || logoFailed) return null;
    // Skip our own domains
    if (domain.includes('servicehub') || domain.includes('gpt-servicehub')) return null;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }, [domain, logoFailed]);

  if (logoUrl && !logoFailed) {
    return (
      <div className={`${sizeClasses} flex-shrink-0 relative overflow-hidden bg-white/[0.06] border border-white/[0.08] flex items-center justify-center ${className}`}>
        <img
          src={logoUrl}
          alt=""
          className="w-5 h-5 object-contain"
          onError={() => setLogoFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: gradient letter avatar
  return (
    <div className={`${sizeClasses} bg-gradient-to-br ${getAvatarColor(from)} flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className={`text-white ${textSize} font-bold`}>{senderInitial(from)}</span>
    </div>
  );
}

// Re-export helpers for backward compat
export { senderName, senderInitial, getAvatarColor, extractDomain };

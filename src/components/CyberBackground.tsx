/**
 * CyberBackground — Animated cyber-security themed background.
 *
 * Renders floating SVG icons (shields, locks, keys, fingerprints, etc.)
 * that drift slowly across the screen, reinforcing the security theme.
 *
 * Variants:
 *   "security" — shields, locks, keys, fingerprints  (2FA page)
 *   "inbox"    — envelopes, check-shields, mail locks (Receive Code page)
 */

import React, { useMemo } from 'react';

type Variant = 'security' | 'inbox';

interface CyberBackgroundProps {
  variant?: Variant;
}

/* ── SVG icon paths ─────────────────────────────────── */

const securityIcons = [
  // Shield
  <path key="shield" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  // Lock
  <><path key="lock1" d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" /><path key="lock2" d="M7 11V7a5 5 0 0110 0v4" /></>,
  // Key
  <><path key="key1" d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></>,
  // Fingerprint
  <><path key="fp1" d="M12 10a2 2 0 00-2 2c0 1.02-.1 2.51-.26 4" /><path key="fp2" d="M14 13.12c0 2.38-.37 4.77-1.28 6.88" /><path key="fp3" d="M6.54 17.37A10 10 0 016 12a6 6 0 0112 0c0 .67-.03 1.34-.09 2" /><path key="fp4" d="M8 12a4 4 0 018 0" /><path key="fp5" d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path key="fp6" d="M12 6a6 6 0 00-6 6c0 2.22-.13 4.18-.62 6" /></>,
  // Eye (surveillance)
  <><path key="eye1" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle key="eye2" cx="12" cy="12" r="3" /></>,
  // Shield check
  <><path key="sc1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path key="sc2" d="M9 12l2 2 4-4" /></>,
  // Terminal
  <><path key="t1" d="M4 17l6-6-6-6" /><path key="t2" d="M12 19h8" /></>,
  // Hash / code
  <><path key="h1" d="M4 9h16" /><path key="h2" d="M4 15h16" /><path key="h3" d="M10 3L8 21" /><path key="h4" d="M16 3l-2 18" /></>,
];

const inboxIcons = [
  // Envelope
  <><path key="env1" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path key="env2" d="M22 6l-10 7L2 6" /></>,
  // Shield check
  <><path key="sc1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path key="sc2" d="M9 12l2 2 4-4" /></>,
  // Inbox
  <><path key="in1" d="M22 12h-6l-2 3h-4l-2-3H2" /><path key="in2" d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></>,
  // Lock
  <><path key="lock1" d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" /><path key="lock2" d="M7 11V7a5 5 0 0110 0v4" /></>,
  // Check circle
  <><path key="cc1" d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path key="cc2" d="M22 4L12 14.01l-3-3" /></>,
  // Mail + shield
  <path key="shield" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  // Bell
  <><path key="b1" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path key="b2" d="M13.73 21a2 2 0 01-3.46 0" /></>,
  // Key
  <><path key="key1" d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></>,
];

/* ── Floating icon component ────────────────────────── */

interface FloatingIconProps {
  children: React.ReactNode;
  index: number;
  total: number;
}

function FloatingIcon({ children, index, total }: FloatingIconProps) {
  const style = useMemo(() => {
    // Deterministic pseudo-random distribution
    const seed = (index * 7919 + 104729) % 100;
    const seed2 = (index * 6271 + 32749) % 100;
    const seed3 = (index * 4517 + 66889) % 100;

    const left = (seed / 100) * 90 + 5; // 5-95%
    const top = (seed2 / 100) * 85 + 5; // 5-90%
    const size = 18 + (seed3 / 100) * 20; // 18-38px
    const duration = 18 + (seed / 100) * 25; // 18-43s
    const delay = -(seed2 / 100) * 30; // stagger start
    const rotate = (seed3 / 100) * 360;
    const opacity = 0.03 + (seed / 100) * 0.06; // 0.03 - 0.09

    return {
      position: 'absolute' as const,
      left: `${left}%`,
      top: `${top}%`,
      width: `${size}px`,
      height: `${size}px`,
      opacity,
      transform: `rotate(${rotate}deg)`,
      animation: `cyberFloat${index % 4} ${duration}s ease-in-out ${delay}s infinite`,
      willChange: 'transform, opacity',
    };
  }, [index, total]);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
      style={style}
    >
      {children}
    </svg>
  );
}

/* ── Main component ─────────────────────────────────── */

const CyberBackground: React.FC<CyberBackgroundProps> = ({ variant = 'security' }) => {
  const icons = variant === 'inbox' ? inboxIcons : securityIcons;

  // Create 18 floating icons, cycling through the icon set
  const elements = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => (
      <FloatingIcon key={i} index={i} total={18}>
        {icons[i % icons.length]}
      </FloatingIcon>
    ));
  }, [icons]);

  return (
    <div className="cyber-icons-layer">
      {elements}
    </div>
  );
};

export default React.memo(CyberBackground);

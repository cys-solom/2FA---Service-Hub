import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  {
    to: '/2fa-code',
    label: '2FA Code',
    activeColor: 'emerald',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    to: '/service-mail',
    label: 'Service Mail',
    activeColor: 'violet',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/receive-code',
    label: 'Inbox',
    activeColor: 'cyan',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
];

const activeStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shadow-sm shadow-emerald-500/10',
  violet: 'bg-violet-500/15 text-violet-300 border border-violet-500/25 shadow-sm shadow-violet-500/10',
  cyan: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 shadow-sm shadow-cyan-500/10',
};

const Navigation: React.FC = () => {
  const location = useLocation();

  // Hide nav on admin page
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#0a0a1a]/80 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/40">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? activeStyles[item.activeColor]
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
                }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;

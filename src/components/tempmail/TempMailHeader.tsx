import React from 'react';

const TempMailHeader: React.FC = () => (
  <div className="text-center mb-8 animate-fade-in-up" style={{ opacity: 0 }}>
    {/* Icon */}
    <div className="relative inline-flex items-center justify-center mb-5">
      <div className="absolute w-16 h-16 rounded-2xl bg-violet-500/20 blur-xl animate-pulse" />
      <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    </div>

    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">
      <span className="text-white">Service Hub</span>
      <span className="text-white/30 mx-1.5">-</span>
      <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Temp Mail</span>
    </h1>

    <p className="text-white/25 text-xs sm:text-sm font-light tracking-wide mb-4">
      Private temporary inboxes for testing &amp; verification
    </p>

    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/[0.08] border border-violet-500/15">
      <svg className="w-3.5 h-3.5 text-violet-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span className="text-[11px] text-violet-300/70 font-medium tracking-wide">
        Receive-only · Auto-expiring · No data stored
      </span>
    </div>
  </div>
);

export default TempMailHeader;

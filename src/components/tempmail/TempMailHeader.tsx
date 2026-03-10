import React from 'react';

const TempMailHeader: React.FC = () => (
  <div className="text-center mb-8 animate-fade-in-up" style={{ opacity: 0 }}>
    {/* Animated icon */}
    <div className="relative inline-flex items-center justify-center mb-5">
      <div className="absolute w-20 h-20 rounded-3xl bg-violet-500/15 blur-2xl animate-pulse" />
      <div className="absolute w-14 h-14 rounded-2xl bg-violet-500/10 blur-lg" style={{ animation: 'pulse-ring 3s ease-in-out infinite' }} />
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
    </div>

    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
      <span className="text-white">Service Hub</span>
      <span className="text-white/20 mx-2">—</span>
      <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Mail</span>
    </h1>

    <p className="text-white/20 text-xs sm:text-sm font-light tracking-wide mb-5">
      Private inboxes for testing & verification
    </p>

    <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-emerald-400/60" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
        <span className="text-[10px] text-white/30 font-medium">Receive-only</span>
      </div>
      <div className="w-px h-3 bg-white/[0.06]" />
      <div className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-violet-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[10px] text-white/30 font-medium">Encrypted</span>
      </div>
      <div className="w-px h-3 bg-white/[0.06]" />
      <div className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-[10px] text-white/30 font-medium">Instant</span>
      </div>
    </div>
  </div>
);

export default TempMailHeader;

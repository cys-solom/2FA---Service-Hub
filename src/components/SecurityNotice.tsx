import React from 'react';

const SecurityNotice: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2 text-white/20 text-[11px] mt-6 animate-fade-in"
      style={{ animationDelay: '0.3s', opacity: 0 }}>
      <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-2.5 h-2.5 text-emerald-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="tracking-wide">Codes are generated locally. Secrets never leave your browser.</span>
    </div>
  );
};

export default SecurityNotice;

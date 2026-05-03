/**
 * Error Boundary — Prevents full-page white-screen crashes.
 *
 * Catches React render errors and shows a friendly fallback UI
 * with a retry button instead of a blank page.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm text-center">
            {/* Error icon */}
            <div className="relative inline-flex items-center justify-center mb-5">
              <div className="absolute w-20 h-20 rounded-3xl bg-red-500/15 blur-2xl animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-xl shadow-red-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white/80 mb-2">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-xs text-white/25 mb-6 leading-relaxed">
              An unexpected error occurred. You can try again or reload the page.
            </p>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/[0.04] border border-red-500/10 text-left">
                <p className="text-[10px] text-red-400/50 font-mono truncate">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.97] transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </span>
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl text-xs font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60 transition-all"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Upgrade #1 — Global error boundary.
 * Any render crash now shows a recoverable screen (with state reset)
 * instead of a blank white page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    try {
      // eslint-disable-next-line no-console
      console.error('[VSLA] Render crash captured:', error);
    } catch {
      /* noop */
    }
  }

  private handleReset = (): void => {
    try {
      localStorage.removeItem('bakwata_vsla_state');
    } catch {
      /* noop */
    }
    this.setState({ hasError: false });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7F6] flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#B91C1C]">error</span>
            <h1 className="font-bold text-lg text-[#141b2b] mt-2">Something went wrong</h1>
            <p className="text-sm text-[#4B5563] mt-1">
              The app hit an unexpected error. Your records are stored on this phone and are safe.
            </p>
            <p className="text-sm text-[#4B5563] mt-1">Kinnuma kituufu — ebiwandiiko byo biri ku ssimu yo.</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-4 w-full min-h-[48px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

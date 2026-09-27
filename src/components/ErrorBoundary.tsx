import React from 'react';
import { Language } from '../types';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  language?: Language;
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
    this.setState({ hasError: false });
    window.location.reload();
  };

  private downloadEmergencyBackup = (): void => {
    try {
      const raw = localStorage.getItem('bakwata_vsla_state') || '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vsla-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`;
       link.click();
       URL.revokeObjectURL(url);
     } catch {
       return;
     }
   };

  render(): React.ReactNode {
    const str = (en: string, lu: string) => this.props.language === 'LU' ? lu : en;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7F6] flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#B91C1C]">error</span>
            <h1 className="font-bold text-lg text-[#141b2b] mt-2">{str('Something went wrong', 'Waliwo ekikyamu')}</h1>
            <p className="text-sm text-[#4B5563] mt-1">
              {str('The app hit an unexpected error. Your records are stored on this phone and are safe.', 'App yafuna ekikyamu ekasikiriza. Ebitabo byo biri ku ssimu yo era tebali kulikwanganya.')}
            </p>
            <button
              type="button"
              aria-label={str('Download emergency backup', 'Koppa backup y\'okujja')}
              onClick={this.downloadEmergencyBackup}
              className="mt-4 w-full min-h-[48px] bg-surface-container text-[#00261b] rounded-lg font-bold text-sm active:scale-[0.99]"
            >
              {str('Download emergency backup', 'Koppa backup y\'okujja')}
            </button>
            <button
              type="button"
              aria-label={str('Reload App', 'Kozesa App')}
              onClick={this.handleReset}
              className="mt-2 w-full min-h-[48px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
            >
              {str('Reload App', 'Kozesa App')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

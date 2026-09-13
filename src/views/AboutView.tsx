import React from 'react';
import { Language, ScreenId } from '../types';
import { APP_VERSION } from '../data/changelog';

interface AboutViewProps {
  onNavigate: (screen: ScreenId) => void;
  language?: Language;
  groupName?: string;
}

/**
 * Upgrade #15 — product landing / about screen: what the platform
 * is, why groups trust it, and how to install it. Shareable pitch
 * for secretaries recruiting neighbouring groups.
 */
export const AboutView: React.FC<AboutViewProps> = ({
  onNavigate,
  language = 'EN',
  groupName = 'Bakwata Savings Group',
}) => {
  const str = (en: string, lu: string, sw: string) =>
    language === 'LU' ? lu : language === 'SW' ? sw : en;

  const features = [
    { icon: 'menu_book', t: str('Digital passbooks for every saver', 'Ppaasibuku ya buli mukiise', 'Vitabu vya kila mwanachama') },
    { icon: 'lock', t: str('3-key strongbox reconciliation', 'Okusiba sanduuko n\'ebisumuluzo 3', 'Kufunga sanduku kwa funguo 3') },
    { icon: 'payments', t: str('Loans, welfare grants & fines', 'Ebyewolo, obuyambi n\'engassi', 'Mikopo, jamii na faini') },
    { icon: 'cloud_sync', t: str('Offline-first with safe backups', 'Ekola awatali yintaneeti', 'Inafanya kazi bila mtandao') },
    { icon: 'receipt_long', t: str('Receipts, reports & full audit trail', 'Risiti, lipoota n\'okukebera', 'Risiti, ripoti na ukaguzi') },
    { icon: 'translate', t: str('English, Luganda & Swahili', 'Oluzungu, Oluganda', 'Kiingereza, Kiswahili') },
  ];

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary active:scale-95 transition"
          type="button"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">{str('About VSLA UG', 'Ebikwata ku VSLA UG', 'Kuhusu VSLA UG')}</h1>
          <p className="text-xs text-text-muted">{groupName}</p>
        </div>
      </div>

      <section className="bg-primary-container text-white rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
          <span className="material-symbols-outlined text-[140px]">account_balance</span>
        </div>
        <p className="text-xs uppercase tracking-wider text-primary-fixed font-bold">
          {str('The digital strongbox for village savings', 'Sanduuko ya digito', 'Sanduku la kidijitali')}
        </p>
        <p className="text-sm mt-1.5 leading-relaxed text-white/90">
          {str(
            'Built with Kampala savings groups: stamp shares, approve loans, seal the box with 3 keys — all from one phone, even offline.',
            'Kyakolebwa n\'ebibiina by\'e Kampala: teeka sitampu, kiriza ebyewolo, siba sanduuko n\'ebisumuluzo 3 — byonna ku ssimu emu.',
            'Imejengwa na vikundi vya Kampala: weka stempu, idhinisha mikopo, funga sanduku — yote kwenye simu moja.'
          )}
        </p>
      </section>

      <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-2.5">
        {features.map((f) => (
          <div key={f.t} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-surface-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
            </span>
            <span className="text-xs font-semibold text-on-surface">{f.t}</span>
          </div>
        ))}
      </section>

      <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          {str('Install on your phone', 'Teeka ku ssimu yo', 'Sakinisha kwenye simu')}
        </h3>
        <p className="text-xs text-text-muted leading-relaxed">
          {str(
            'Android (Chrome): menu ⋮ → Add to Home Screen. iPhone (Safari): Share → Add to Home Screen. It then opens full-screen and works offline.',
            'Android (Chrome): menu ⋮ → Add to Home Screen. iPhone (Safari): Share → Add to Home Screen.',
            'Android (Chrome): menyu ⋮ → Add to Home Screen. iPhone (Safari): Share → Add to Home Screen.'
          )}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('legal')}
          className="w-full min-h-[44px] text-xs font-bold text-primary underline"
        >
          {str('Read Terms, Privacy & Constitution', 'Soma amateeka', 'Soma masharti')}
        </button>
      </section>

      <p className="text-center text-[11px] text-text-muted font-mono">v{APP_VERSION} · Kampala, Uganda</p>
    </main>
  );
};

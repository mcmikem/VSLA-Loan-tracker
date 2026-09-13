import React, { useState } from 'react';
import { Language, ScreenId } from '../types';
import { getTranslations } from '../i18n/translations';

interface LegalViewProps {
  onNavigate: (screen: ScreenId) => void;
  language?: Language;
  groupName?: string;
}

/**
 * Upgrade #9 — Terms of Service, Privacy Policy and model VSLA
 * Constitution, required before real groups can adopt the platform.
 */
export const LegalView: React.FC<LegalViewProps> = ({
  onNavigate,
  language = 'EN',
  groupName = 'Bakwata Savings Group',
}) => {
  const [tab, setTab] = useState<'terms' | 'privacy' | 'constitution'>('terms');
  const t = getTranslations(language);

  const pill = (active: boolean) =>
    `flex-1 py-2 px-2 rounded-lg text-xs font-bold transition ${
      active ? 'bg-primary-container text-white shadow-sm' : 'text-text-muted hover:text-primary'
    }`;

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
          <h1 className="font-bold text-primary">{t.legal.title}</h1>
          <p className="text-xs text-text-muted">{groupName}</p>
        </div>
      </div>

      <div className="flex bg-surface-card p-1 rounded-xl border border-border-strong">
        <button type="button" onClick={() => setTab('terms')} className={pill(tab === 'terms')}>
          {t.legal.termsTab}
        </button>
        <button type="button" onClick={() => setTab('privacy')} className={pill(tab === 'privacy')}>
          {t.legal.privacyTab}
        </button>
        <button
          type="button"
          onClick={() => setTab('constitution')}
          className={pill(tab === 'constitution')}
        >
          {t.legal.constitutionTab}
        </button>
      </div>

      <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm text-xs text-on-surface space-y-3 leading-relaxed">
        {tab === 'terms' && (
          <>
            <h2 className="font-bold text-sm text-primary">Terms of Service</h2>
            <p>1. <strong>Group responsibility.</strong> Bakwata VSLA is a record-keeping tool. Cash custody, loan decisions and dispute resolution remain the responsibility of the savings group and its elected officers.</p>
            <p>2. <strong>Accurate records.</strong> Secretaries and treasurers must record transactions truthfully at meeting time. Deliberate falsification is a constitutional offence in your group.</p>
            <p>3. <strong>Your data.</strong> Records are stored on your device and, where enabled, synced to your group's private store. Export your backup regularly from Backup &amp; Audit.</p>
            <p>4. <strong>Fair use.</strong> One account per member. Do not share officer PINs. Report misuse to your group chairperson.</p>
            <p>5. <strong>Availability.</strong> The service works offline; sync requires connectivity. We aim for 99% availability but give no warranty for free plans.</p>
            <p className="text-text-muted">Last updated September 2026 · Kampala, Uganda</p>
          </>
        )}
        {tab === 'privacy' && (
          <>
            <h2 className="font-bold text-sm text-primary">Privacy Policy</h2>
            <p>1. <strong>What we store.</strong> Member names, phone numbers, savings, loans and meeting records you enter. No tracking cookies, no advertising profiles.</p>
            <p>2. <strong>Where it lives.</strong> On your phone (offline-first) and on the group's synced store so officers share the same books.</p>
            <p>3. <strong>Who sees it.</strong> Only members of your savings group via their signed-in accounts. We never sell member data.</p>
            <p>4. <strong>Your rights.</strong> Any member may request a full export of their passbook (Passbook → Record / Sheet) and may ask the secretary to correct errors.</p>
            <p>5. <strong>Retention.</strong> Records persist for the life of the group cycle plus one audit year, then may be archived by the secretary.</p>
            <p className="text-text-muted">Questions: ask your group secretary or chairperson.</p>
          </>
        )}
        {tab === 'constitution' && (
          <>
            <h2 className="font-bold text-sm text-primary">Model VSLA Constitution (adapt in a group vote)</h2>
            <p><strong>Article 1 — Name &amp; purpose.</strong> The group pools weekly savings, lends to members at agreed interest, and supports members in emergencies through the welfare fund.</p>
            <p><strong>Article 2 — Membership.</strong> Open to adults of good standing admitted by majority vote. One passbook per member. Exit only at cycle end after clearing debts.</p>
            <p><strong>Article 3 — Shares.</strong> Share price is fixed per cycle. Members buy 1–5 shares weekly. Maximum loan is 3× a member's savings.</p>
            <p><strong>Article 4 — Loans.</strong> 5% monthly service charge on reducing balance. Two guarantors required. Defaulters lose guarantor cover first, then savings.</p>
            <p><strong>Article 5 — Welfare.</strong> Fixed monthly contribution. Grants are non-repayable and approved by officers for medical, bereavement and disaster cases.</p>
            <p><strong>Article 6 — The box.</strong> Three different keyholders, verified counts, dual signatures on every opening. Never open outside a meeting.</p>
            <p><strong>Article 7 — Fines.</strong> Late arrival, absence without apology, phone disruption — fines set by the group and collected into the box.</p>
            <p><strong>Article 8 — Share-out.</strong> At cycle end the full fund plus interest is divided pro-rata by shares. Debts are deducted first.</p>
            <p className="text-text-muted">Adopted by group resolution · signed by Chairperson, Secretary, Treasurer.</p>
          </>
        )}
      </section>
    </main>
  );
};

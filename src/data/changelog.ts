/**
 * Upgrade #20 — in-app changelog.
 * Bump APP_VERSION with every market release; users on older
 * cached builds see a "What's new" sheet once after updating.
 */
export const APP_VERSION = '1.4.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.0',
    date: 'Sep 2026',
    highlights: [
      'Financial Reports with arrears watch and CSV export',
      'Real cycle share-out: payouts posted to every passbook',
      'Printable transaction receipts',
      'Audit trail of every cash movement',
    ],
  },
  {
    version: '1.3.0',
    date: 'Sep 2026',
    highlights: [
      'Member search by name, number or phone',
      'Installable app (Add to Home Screen)',
      'Terms, Privacy Policy and model Constitution',
      'Member record export (JSON + CSV)',
    ],
  },
  {
    version: '1.2.0',
    date: 'Sep 2026',
    highlights: [
      'Multi-group support with invite codes',
      'Luganda and English',
      'Offline-first: works without internet',
    ],
  },
];

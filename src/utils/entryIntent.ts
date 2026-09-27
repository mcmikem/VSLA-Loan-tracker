/**
 * Which door did the visitor choose on the landing page?
 *
 * The landing's "Open the app" button is not a bare link any more: it offers
 * try-the-demo / log-in / register, and each one arrives here as
 * /app?intent=demo|login|register. Strangers who type /app directly get the
 * normal welcome screen with the same three choices.
 */
export type EntryIntent = 'demo' | 'login' | 'register';

const VALID: EntryIntent[] = ['demo', 'login', 'register'];

export const readEntryIntent = (search: string): EntryIntent | null => {
  try {
    const value = new URLSearchParams(search || '').get('intent');
    return VALID.includes(value as EntryIntent) ? (value as EntryIntent) : null;
  } catch {
    return null;
  }
};

/** Remove ?intent so a refresh does not re-trigger the demo door. */
export const stripEntryIntent = (href: string): string => {
  try {
    const url = new URL(href);
    if (!url.searchParams.has('intent')) return href;
    url.searchParams.delete('intent');
    return url.pathname + url.search + url.hash;
  } catch {
    return href;
  }
};

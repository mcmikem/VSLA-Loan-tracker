/**
 * Luganda audit — what a native speaker actually needs to review.
 *
 * We only ship Luganda we can quote from a corpus, so everything else stays
 * English. This script lists every such gap with its file and line so a
 * reviewer in Kampala can work through the list instead of guessing.
 *
 *   npx tsx scripts/audit-luganda.ts          # human-readable report
 *   npx tsx scripts/audit-luganda.ts --json   # machine-readable for a translator
 *   npx tsx scripts/audit-luganda.ts --fail   # exit 1 if anything is untranslated
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { translations } from '../src/i18n/translations';

export interface Gap {
  /** Dotted key path for dictionary strings, or file:line for inline ones. */
  where: string;
  english: string;
  /** The Luganda we found, when it exists and is not the English. */
  luganda?: string;
  note?: string;
}

type Tree = { [key: string]: unknown };

function collectLeaves(node: unknown, path: string[] = []): Array<{ key: string; value: string }> {
  if (typeof node === 'string') return [{ key: path.join('.'), value: node }];
  if (node && typeof node === 'object') {
    return Object.entries(node as Tree).flatMap(([k, v]) => collectLeaves(v, [...path, k]));
  }
  return [];
}

/**
 * Words the translator keeps in English on purpose. Groups already say these
 * out loud in English, and a treasurer should not have to translate one in
 * their head to read a balance. Listing them here keeps the audit honest: a
 * word we have decided to keep is not a gap for a reviewer to chase.
 */
const KEEP_IN_ENGLISH = new Set([
  // lower-cased: the comparison is case-insensitive, so "Shares" and "shares"
  // are the same decision, not two
  'vsla ug', 'vsla', 'ugx', 'en', 'lg', 'lu', 'pin', 'mtn', 'airtel', 'whatsapp',
  'sms', 'json', 'momo', 'ok', 'id', 'csv', 'pdf', 'pro', 'sacco', 'atm',
  'app', 'backup', 'demo', 'pilot', 'share', 'shares', 'cash', 'bank',
  'treasurer', 'secretary', 'audit', 'waitlist',
]);

/**
 * Brand names, currency, initialisms and the words we ship in English.
 * Note: this only catches a Luganda value identical to its English. A
 * half-finished string such as "Repayment amount (UGX)" for "Cash Repayment
 * Amount (UGX)" differs, so it never appeared on the work list. An ASCII-only
 * heuristic was tried and rejected: it flagged 177 correct strings.
 */
export function isKeptInEnglish(value: string): boolean {
  const v = value.trim();
  if (/^[A-Z]{2,}$/.test(v)) return true;
  return KEEP_IN_ENGLISH.has(v.toLowerCase());
}

/** Dictionary leaves where LU still reads as English. */
export function dictionaryGaps(): Gap[] {
  const en = new Map(collectLeaves(translations.EN).map((l) => [l.key, l.value]));
  const gaps: Gap[] = [];
  for (const { key, value } of collectLeaves(translations.LU)) {
    const english = en.get(key);
    // Brand names, codes, currency and proper nouns are allowed to match.
    if (english === value && !isKeptInEnglish(value)) {
      gaps.push({ where: key, english: value });
    }
  }
  return gaps;
}

/** Inline str('English', 'Luganda') calls where the Luganda is still English. */
export function inlineGaps(root = 'src'): Gap[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(full)) files.push(full);
    }
  };
  walk(root);

  const gaps: Gap[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const matches = line.matchAll(/str\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g);
      for (const m of matches) {
        if (m[1] === m[2] && m[1].length > 2) {
          gaps.push({ where: `${file}:${i + 1}`, english: m[1], note: 'inline str()' });
        }
      }
    });
  }
  return gaps;
}

/** Everything the landing page says in Luganda, so a reviewer sees it here. */
export function landingGaps(): Gap[] {
  const file = 'index.html';
  let html = '';
  try {
    html = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const gaps: Gap[] = [];
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    // a .lu span followed later on the line by its .en twin: the reviewer
    // checks the first against the second
    for (const m of line.matchAll(/canva-text\s+(?:block\s+)?lu"[^>]*>([^<]+)<\/span>\s*<span class="canva-text[^>]*\ben\b"[^>]*>([^<]+)<\/span>/g)) {
      if (m[1].trim() && m[1].trim() !== m[2].trim()) {
        gaps.push({ where: `${file}:${i + 1}`, english: m[2].trim(), note: `landing LU reads: ${m[1].trim()}` });
      }
    }
  });
  return gaps;
}

export function audit(): { gaps: Gap[]; untranslated: number; inline: number } {
  const dict = dictionaryGaps();
  const inline = inlineGaps();
  const landing = landingGaps();
  return { gaps: [...dict, ...inline, ...landing], untranslated: dict.length, inline: inline.length };
}

if (process.argv[1] && process.argv[1].endsWith('audit-luganda.ts')) {
  const { gaps, untranslated, inline } = audit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ untranslated, inline, gaps }, null, 2));
  } else {
    console.log(`Luganda audit — ${untranslated} dictionary strings + ${inline} inline strings still English\n`);
    for (const g of gaps) {
      const found = g.luganda && g.luganda !== g.english ? `  <- still English: "${g.luganda}"` : '';
      console.log(`  ${g.where.padEnd(34)} ${g.english}${found}`);
    }
    console.log(`\nThese are the words to hand a Luganda speaker.`);
  }
  if (process.argv.includes('--fail') && gaps.length > 0) process.exit(1);
}

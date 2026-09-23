import { translations } from '../src/i18n/translations';

type TranslationTree = Record<string, unknown>;

const leafPaths = (value: unknown, prefix = ''): string[] => {
  if (typeof value === 'function' || value === null || typeof value !== 'object') {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as TranslationTree).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
};

const atPath = (tree: TranslationTree, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as TranslationTree)[key];
  }, tree);

const enPaths = new Set(leafPaths(translations.EN));
const luPaths = new Set(leafPaths(translations.LU));
const errors: string[] = [];

for (const path of enPaths) {
  if (!luPaths.has(path)) errors.push(`Missing Luganda key: ${path}`);
}
for (const path of luPaths) {
  if (!enPaths.has(path)) errors.push(`Unexpected Luganda key: ${path}`);
}

const lu = translations.LU as unknown as TranslationTree;
const requireTerm = (paths: string[], term: string, label: string) => {
  for (const path of paths) {
    const value = atPath(lu, path);
    // Function leaves (e.g. memberBadge) are checked against their source —
    // template literals keep the wording inline.
    const text = typeof value === 'function' ? value.toString() : value;
    if (typeof text !== 'string' || !text.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
      errors.push(`Inconsistent ${label}: ${path} should contain “${term}”`);
    }
  }
};

requireTerm(
  ['passbook.title', 'passbook.selectMemberPrompt', 'passbook.selectMember', 'passbook.memberBadge'],
  'Omukiise',
  'member wording'
);

const sharePrice = atPath(lu, 'home.sharePrice');
const shareValue = atPath(lu, 'home.shareValue');
if (sharePrice === shareValue) {
  errors.push('Ambiguous share wording: home.sharePrice and home.shareValue are identical');
}

const backupSubtitle = atPath(lu, 'home.simpleSaveBackupSub');
if (typeof backupSubtitle === 'string' && /kweka/i.test(backupSubtitle)) {
  errors.push('Suspicious backup wording: home.simpleSaveBackupSub still uses “Kweka”');
}

if (errors.length > 0) {
  console.error(errors.map((error) => `✗ ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`✓ Luganda key parity: ${enPaths.size} translation leaves checked`);
  console.log('✓ Member, share-value, and backup terminology checks passed');
}

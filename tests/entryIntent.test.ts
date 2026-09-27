import { describe, expect, it } from 'vitest';
import { readEntryIntent, stripEntryIntent } from '../src/utils/entryIntent';

describe('landing → app door choice', () => {
  it('reads only the three doors we offer', () => {
    expect(readEntryIntent('?intent=demo')).toBe('demo');
    expect(readEntryIntent('?intent=login')).toBe('login');
    expect(readEntryIntent('?intent=register')).toBe('register');
    expect(readEntryIntent('?intent=admin')).toBeNull();
    expect(readEntryIntent('?intent=')).toBeNull();
    expect(readEntryIntent('')).toBeNull();
    expect(readEntryIntent('?other=1')).toBeNull();
  });

  it('tolerates junk in the query string', () => {
    expect(readEntryIntent('?utm=x&intent=login&y=2')).toBe('login');
    expect(readEntryIntent('???')).toBeNull();
  });

  it('cleans the intent off the URL so a refresh is not a re-trigger', () => {
    expect(stripEntryIntent('https://x.app/app?intent=demo')).toBe('/app');
    expect(stripEntryIntent('https://x.app/app?intent=login&lang=LU')).toBe('/app?lang=LU');
    expect(stripEntryIntent('https://x.app/app')).toBe('https://x.app/app');
    expect(stripEntryIntent('https://x.app/app?other=1')).toBe('https://x.app/app?other=1');
  });

  it('never hands a path to a stranger domain', () => {
    expect(stripEntryIntent('not a url')).toBe('not a url');
  });
});

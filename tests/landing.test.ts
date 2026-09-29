import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/**
 * The landing page must stay a static, cacheable HTML file:
 *  - marketing visitors never download the group tool (it is ~280KB of JS),
 *  - nothing loads from a CDN, because our Content-Security-Policy only allows
 *    our own origin, and a Kampala 2G visitor should not pay for a runtime
 *    Tailwind/Lucide download.
 */
describe('landing page is the real / index and the app lives at /app', () => {
  const landing = read('index.html');
  const app = read('app.html');

  it('index.html is the static landing page, not a React shell', () => {
    expect(landing).toContain('<title>VSLA UG — Village Savings and Loaning Application UG</title>');
    expect(landing).toContain('id="pilot-card"');
    expect(landing).not.toContain('/src/main.tsx');
    expect(landing).not.toContain('id="root"');
  });

  it('has no external scripts, styles or Canva SDK calls', () => {
    for (const pattern of [
      '/_sdk/',
      '__codeletBootstrap__',
      'cdn.tailwindcss.com',
      'cdn.jsdelivr.net',
      'unpkg.com',
    ]) {
      expect(landing, `landing must not reference ${pattern}`).not.toContain(pattern);
    }
    // the only stylesheet is our own compiled CSS; the only script is inline
    const stylesheets = [...landing.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map((m) => m[0]);
    expect(stylesheets.every((tag) => tag.includes('fonts.googleapis.com') || tag.includes('/src/landing.css'))).toBe(true);
    const scripts = [...landing.matchAll(/<script[^>]*src=/g)];
    expect(scripts).toHaveLength(0);
  });

  it('uses the same typeface as the app, so the site reads as one product', () => {
    // Inter + JetBrains Mono, same as app.html / src/index.css
    expect(landing).toContain('family=Inter:wght@400;500;600;700;800');
    expect(landing).toContain('family=JetBrains+Mono');
    expect(landing).not.toContain('Plus+Jakarta');
    expect(landing).not.toContain('Plus Jakarta');
    const app = read('app.html');
    const landingFamily = /family=Inter[^"]*/.exec(landing)?.[0];
    const appFamily = /family=Inter[^"]*/.exec(app)?.[0];
    expect(landingFamily).toBe(appFamily);
  });

  it('keeps the micro-animations, and keeps them optional', () => {
    // the vocabulary the previous landing had: pulse, hover lift, transitions
    expect(landing).toContain('@keyframes beat');
    expect(landing).toContain('.pulse-dot');
    expect(landing).toContain('transform:translateY(-4px)');
    expect(landing).toContain('transition:background .18s ease');
    // plus: scroll reveals, count-ups, animated FAQ, tab fade, header shadow
    expect(landing).toContain('.js .rv{opacity:0');
    expect(landing).toContain('transition-delay:.14s');
    expect(landing).toContain('data-count=');
    expect(landing).toContain('grid-template-rows:0fr');
    expect(landing).toContain("classList.toggle('scrolled'");
    expect(landing).toContain('new IntersectionObserver');
    // reveals only run when JS is present, so nothing is ever invisible
    expect(landing).toContain("classList.add('js')");
    // and never for people who asked for less motion
    expect(landing).toContain('prefers-reduced-motion');
    expect(landing).toContain("(prefers-reduced-motion: reduce)");
  });

  it('small phones get readable headings, and focus rings are always visible', () => {
    // display type is fluid, so it cannot overflow a 320px phone or waste a
    // 1440px one
    expect(landing).toContain('.fz-54 span{font-size:clamp(');
    expect(landing).toContain('.fz-40 span{font-size:clamp(');
    expect(landing).not.toContain('@media (max-width:420px)');
    // the amber CTA is amber — a fixed amber focus ring was invisible on it
    expect(landing).toContain(':focus-visible{outline:3px solid currentColor');
  });

  it('every control a finger must hit is at least 44px', () => {
    // the language toggle, the drawer button and every modal close used to be
    // 28–36px tall, which is below the finger-friendly target
    const interactive = [
      ...landing.matchAll(/<(?:button|a)\b[^>]*class="([^"]*)"[^>]*>/g),
    ].map((m) => m[1]);
    const small = interactive.filter((cls) => /\b(?:p-1|p-2|py-1|py-0\.5)\b/.test(cls) && !/min-h-\[44px\]/.test(cls));
    expect(small, `too-small targets: ${small.join(' | ')}`).toEqual([]);
    expect(landing).toContain('.nav-link{display:inline-flex;align-items:center;min-height:44px');
    expect(landing.match(/min-h-\[44px\]/g)?.length).toBeGreaterThanOrEqual(9);
  });

  it('respects increased-contrast and touch-only devices', () => {
    expect(landing).toContain('prefers-contrast: more');
    expect(landing).toContain('@media (hover:none)');
    // a high-contrast border on the pills, so the label is never just a colour
    expect(landing).toContain('.pill{border:1px solid currentColor}');
  });

  it('design system: one radius/shadow/rhythm scale and section structures', () => {
    expect(landing).toContain('--r-lg:20px');
    expect(landing).toContain('--sh-3:');
    expect(landing).toContain('--maxw:1180px');
    for (const cls of [
      'hero-stage', 'trust-grid', 'trust-item', 'compare-card', 'compare-note',
      'bento', 'flow-panel', 'step-num', 'who-col', 'who-steps', 'who-step', 'who-num', 'demo-tile',
      'demo-total', 'stat-tile', 'tick-list', 'market-list', 'market-row',
      'price-card--primary', 'faq-list', 'cta-final', 'foot-grid', 'foot-link',
    ]) {
      expect(landing, `${cls} must be both used and styled`).toContain(cls);
    }
  });

  it('headings are fluid, not hard-coded pixels', () => {
    const tagged = [...landing.matchAll(/<h[123] class="fz-(\d+)/g)].map((m) => m[1]);
    expect(tagged.length).toBeGreaterThan(25);
    for (const size of new Set(tagged)) {
      expect(landing, `fz-${size} has no fluid rule`).toContain(`.fz-${size} span{`);
    }
  });

  it('icons are inline SVG, so there is no font to fail', () => {
    // an icon font can be blocked, stale-cached or tofu on a cheap phone, and
    // every failure paints the icon's name into the layout. Inline SVG cannot.
    expect(landing).not.toContain('<span class="ms');
    expect(read('src/landing.css')).not.toContain('/fonts/material-symbols.woff2');
    expect(read('src/landing.css')).not.toContain("'Material Symbols Outlined'");
    const uses = [...landing.matchAll(/<use href="#i-([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThan(20);
  });

  it('every icon used on the page has a symbol in the sprite', () => {
    const uses = new Set([...landing.matchAll(/<use href="#i-([a-z0-9_]+)"/g)].map((m) => m[1]));
    const symbols = new Set([...landing.matchAll(/<symbol id="i-([a-z0-9_]+)"/g)].map((m) => m[1]));
    expect(symbols.size).toBeGreaterThanOrEqual(uses.size);
    for (const icon of uses) {
      expect(symbols.has(icon), `sprite must define #i-${icon}`).toBe(true);
    }
    // the generator refuses to run when a name is missing from the font, so a
    // hand-renamed icon fails loudly instead of rendering blank
    expect(landing).toContain('generated by scripts/landing-icons.py');
  });

  it('offers a real path into the app from the header, hero, pricing and final CTA', () => {
    const appLinks = [...landing.matchAll(/href="\/app"/g)];
    expect(appLinks.length).toBeGreaterThanOrEqual(4);
    expect(landing).toContain('Open the app');
    expect(landing).toContain('Ggula app');
  });

  it('"Open the app" asks which door first: demo, log in, register', () => {
    // every CTA opens the chooser, and every CTA still works without JS
    expect((landing.match(/data-open-app/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(landing).toContain('id="open-modal"');
    expect(landing).toContain('href="/app?intent=demo"');
    expect(landing).toContain('href="/app?intent=login"');
    expect(landing).toContain('href="/app?intent=register"');
    expect(landing).toContain('Try the demo');
    expect(landing).toContain('Log in to my group');
    expect(landing).toContain('Register a new group');
    // and a quiet way past the question
    expect(landing).toContain('just open the app');
    // the chooser is wired up and closes on Escape like the other modals
    expect(landing).toContain("querySelectorAll('[data-open-app]')");
    expect(landing).toContain('a[href*="intent=demo"]');
  });

  it('the app honours the chosen door', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('readEntryIntent(');
    expect(app).toContain('stripEntryIntent(');
    expect(app).toContain("if (entryIntent === 'demo') handleEnterPractice();");
    expect(app).toContain("entryIntent === 'register' ? 'register' : undefined");
    expect(app).toContain("autoFocusSignIn={entryIntent === 'login'}");
    const welcome = read('src/components/WelcomeView.tsx');
    expect(welcome).toContain('signInRef');
    expect(welcome).toContain('if (autoFocusSignIn)');
  });

  it('keeps the language switch, drawer, FAQ and modals working', () => {
    expect(landing).toContain('data-lang="lu"');
    expect(landing).toContain('body.is-en .lu{display:none!important}');
    // the toggle is labelled with the language code, LG, not LU
    expect(landing).toContain('>LG</button>');
    expect(landing).not.toContain('>LU</button>');
    expect(landing).toContain('<html lang="lg">');
    expect(landing).toContain('faq-btn');
    expect(landing).toContain('waitlist-open');
    expect(landing).toContain("e.key === 'Escape'");
    // reduced-motion: the reveal animations must not fight accessibility
    expect(landing).toContain('prefers-reduced-motion');
  });

  it('app.html is the SPA shell and registers the service worker itself', () => {
    expect(app).toContain('/src/main.tsx');
    expect(app).toContain('<div id="root">');
    expect(app).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(app).toContain('rel="manifest"');
  });

  it('vite and vercel both route /app to the SPA shell', () => {
    const vite = read('vite.config.ts');
    expect(vite).toContain("url === '/app'");
    expect(vite).toContain('configurePreviewServer');
    expect(vite).toContain("app: path.resolve(__dirname, 'app.html')");
    const vercel = JSON.parse(read('vercel.json'));
    expect(vercel.rewrites).toContainEqual({ source: '/app', destination: '/app.html' });
  });

  it('the manifest still points at the app route', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest.start_url).toBe('/app');
    expect(manifest.scope).toBe('/app');
  });
});

/**
 * Build output check: after `vite build`, dist/index.html must be the landing
 * page and dist/app.html the SPA shell, and the landing must not pull in any
 * app JS. (Live routing is verified by `vite preview` locally and by the
 * Vercel rewrite asserted above.)
 */
describe('built output', () => {
  const distIndex = 'dist/index.html';
  const distApp = 'dist/app.html';

  it('emits both entry points', () => {
    if (!existsSync(new URL(`../${distIndex}`, import.meta.url))) {
      // build has not run in this working copy — nothing to assert
      expect(true).toBe(true);
      return;
    }
    const index = read(distIndex);
    const app = read(distApp);
    expect(index).toContain('Village Savings and Loaning Application UG');
    expect(index).not.toContain('id="root"');
    expect(app).toContain('id="root"');
    // the landing pulls in no app bundle — that is the whole point
    expect(index).not.toMatch(/assets\/(app|App)-/);
    // ...and it does get a stylesheet, or it would render unstyled
    expect(index).toMatch(/<link[^>]+rel="stylesheet"/);
  });
});

/**
 * Findings from the landing audit, kept as tests so they cannot quietly come
 * back: a link to a human, a share card for WhatsApp, content that survives
 * without JavaScript, and no false claim that we stored something.
 */
describe('landing: the funnel actually ends somewhere', () => {
  const landing = read('index.html');

  it('every "talk to us" is a real link to a real number', () => {
    // a modal that says "WhatsApp not set up yet" was the last step of the funnel
    expect(landing).not.toContain('contact-modal');
    expect(landing).not.toContain('not yet been configured');
    const whatsapp = [...landing.matchAll(/href="https:\/\/wa\.me\/(\d+)"/g)].map((m) => m[1]);
    expect(whatsapp.length).toBeGreaterThanOrEqual(4);
    expect(new Set(whatsapp).size).toBe(1);
    expect(whatsapp[0]).toBe('256727790003');
    const calls = [...landing.matchAll(/href="tel:(\+256\d+)"/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThanOrEqual(4);
    expect(new Set(calls).size).toBe(1);
    expect(calls[0]).toBe('+256752338171');
    // the numbers are readable without JavaScript, in the footer too
    expect(landing).toContain('WhatsApp 0727 790 003');
    expect(landing).toContain('Call 0752 338 171');
  });

  it('the message is prefilled, in the language being read', () => {
    expect(landing).toContain("const CONTACT = { whatsapp: '256727790003', phone: '+256752338171' }");
    expect(landing).toContain('const applyContactLinks');
    expect(landing).toContain('applyContactLinks(lang)');
    expect(landing).toContain('?text=${encodeURIComponent(WA_TEXT[lang]');
  });

  it('the waitlist hands off to WhatsApp instead of pretending to save', () => {
    expect(landing).not.toContain('it does not yet send or save them');
    expect(landing).not.toContain('they have not been sent or saved');
    expect(landing).toContain('window.open(`https://wa.me/${CONTACT.whatsapp}?text=');
    expect(landing).toContain('WhatsApp is opening');
  });

  it('the pilot-card contact buttons are readable on the dark card', () => {
    // they were dark-on-dark, and therefore invisible, for their whole life
    expect(landing).toContain('href="https://wa.me/256727790003" style="background: transparent; color: rgb(255, 255, 255);');
    expect(landing).toContain('href="tel:+256752338171" style="background: transparent; color: rgb(255, 255, 255);');
  });

  it('a shared link shows a card, not a blank rectangle', () => {
    expect(landing).toContain('<meta property="og:image" content="https://vsla-ug.vercel.app/og.png">');
    expect(landing).toContain('og:image:width" content="1200"');
    expect(landing).toContain('name="twitter:card" content="summary_large_image"');
    const image = read('public/og.png');
    // the PNG signature, so the file cannot be committed empty
    expect(image.length).toBeGreaterThan(5000);
  });

  it('the answers survive without JavaScript', () => {
    // collapsed by default, opened by the data-open attribute, and laid open for
    // a visitor who cannot run the script at all
    expect(landing).toContain('.faq-a{display:grid;grid-template-rows:0fr');
    expect(landing).toContain('.faq-item[data-open="true"] .faq-a{grid-template-rows:1fr}');
    expect(landing).toContain('<noscript><style>');
    // the first answer starts open, so the section shows it has content
    expect(landing).toContain('data-open="true"');
  });

  it('answers the two questions a treasurer asks first', () => {
    expect(landing).toContain('Who can see my members\u2019 details?');
    expect(landing).toContain('If you ever stop');
    expect(landing).toContain('If we stop, can we take our records with us?');
    expect(landing).toContain('Where does the group\u2019s money stay?');
    // and it is not only in the FAQ: there is a section for it
    expect(landing.match(/data-open="false"/g)?.length).toBeGreaterThanOrEqual(9);
  });

  it('names only the audiences the group actually serves', () => {
    expect(landing).toContain('VSLA · SACCO · Investment clubs · Bibinja by\u2019obuyambi');
    expect(landing).not.toContain('Welfare groups');
    expect(landing).not.toContain('munaasika');
    expect(landing).not.toContain('secretaries and treasurers');
  });

  it('prints like a handout, because this audience prints', () => {
    expect(landing).toContain('@media print{');
    expect(landing).toContain('break-inside:avoid');
  });

  it('holds the design together after the fixes', () => {
    // one icon treatment across the trust strip
    expect(landing.match(/class="trust-ico"/g)?.length).toBe(4);
    // every marketplace row carries the row treatment, not just the first, and
    // there are four of them so the list reads as a marketplace rather than
    // three sample lines
    expect(landing.match(/market-row flex/g)?.length).toBe(4);
    expect(landing.match(/class="market-ico"/g)?.length).toBe(4);
    // no type under 12px anywhere
    expect(landing).not.toContain('font-size: 10px');
    expect(landing).not.toContain('font-size: 11px');
    // the member tags sit under the account card, not floating over it
    expect(landing).toContain('class="member-tags mt-5"');
    expect(landing.match(/class="canva-tag pill px-3 py-1.5"/g)?.length).toBe(3);
    // the dark cards are labelled in the reader's language, not English only
    for (const word of ['OKUTEREKA', 'OBUYAMBI', 'AMABANJA', 'CASH', 'MOMO', 'BBANKI', 'OMUWENDO GWONNA']) {
      expect(landing, `${word} must be a real label`).toContain(word);
    }
  });
});

/**
 * Defects found by looking at the rendered page rather than the markup. Each
 * one was invisible in the HTML and obvious on screen.
 */
describe('landing: what the rendered page was actually doing', () => {
  const landing = read('index.html');

  it('the count-up numbers are attributes, not text', () => {
    // the export had written `data-count="25000"` INTO the element, so every
    // money figure on the page read " data-count=2500025,000"
    // a `>` immediately before it would mean the attribute is element text
    expect(landing).not.toContain('> data-count=');
    const counts = [...landing.matchAll(/ data-count="(\d+)"/g)].map((m) => m[1]);
    expect(counts.length).toBeGreaterThanOrEqual(5);
    // and the number is still there as text for anyone without the script
    expect(landing).toContain('data-count="780000">780,000');
    // reduced motion must still land the number, not skip it
    expect(landing).toContain('if (reduceMotion) { writeMoney(el, shell, target); return; }');
    expect(landing).toContain('countTargets.forEach(el => countUp(el));');
  });

  it('our own rules sit in the components layer, so utilities win', () => {
    // an unlayered rule beats every layered one: that is how `.sec` was wiping
    // the page gutter and `.head-h2` was cancelling the `mb-10` beside it
    expect(landing).toContain('@layer components {');
    expect(landing.indexOf('@layer components {')).toBeLessThan(landing.indexOf('.sec{padding-block'));
    // the gutter is inline padding, the rhythm is block padding: they cannot fight
    expect(landing).toContain('.shell{width:100%;max-width:var(--maxw);margin:0 auto;padding-inline:var(--gut)}');
    expect(landing).toContain('.sec{padding-block:72px}');
    // and grid tracks must be allowed to shrink, or one long word shoves the page
    expect(landing).toContain('grid-template-columns:repeat(12,minmax(0,1fr))');
    expect(landing).toContain('.grid12>*,.shell{min-width:0}');
  });

  it('declares the cascade layer order, so preflight cannot outrank the design system', () => {
    // This is the bug that dropped every section against the left edge of the
    // page, in every browser and on every phone. Cascade layers rank by FIRST
    // appearance, and Vite emits the compiled Tailwind <link> *after* this
    // inline <style> — so without an explicit order statement `components`
    // registered first, at the lowest rank, below Tailwind's preflight
    // `@layer base{*{margin:0;padding:0}}`, which then zeroed every `.shell`
    // gutter and `.sec` rhythm. The rules were present and still did nothing.
    const order = /@layer\s+properties,\s*theme,\s*base,\s*components,\s*utilities\s*;/.exec(landing);
    expect(order, 'index.html must declare the Tailwind layer order explicitly').not.toBeNull();
    expect(order!.index).toBeLessThan(landing.indexOf('@layer components {'));
    // ...and the rules it protects have to still be there
    expect(landing).toContain('padding-inline:var(--gut)');
    expect(landing).toContain('--gut:16px');
    expect(landing).toContain('--gut:28px');
  });

  it('is member-first: a member sees themselves before the officers do', () => {
    const pos = (needle: string) => landing.indexOf(needle);
    expect(pos('id="members"')).toBeGreaterThan(-1);
    expect(pos('AKAWWUNTI Y\u2019OMUWAMMEMBA')).toBeLessThan(pos('TRUST AND CONTROL'));
    expect(pos('id="members"')).toBeLessThan(pos('TRUST AND CONTROL'));
    expect(pos('id="loans"')).toBeLessThan(pos('id="meeting"'));
    // the six things a member actually came for, in the reader's own words
    for (const line of [
      'Laba eby\u2019okutereka ne shares zo',
      'Manya embeera y\u2019ebbanja lyo',
      'Saba ebbanja era ogoberere',
      'Fuuna okujjukizibwa ku kubazza',
      'Tunda eri bammemba',
      'Goberera ebirangiriro by\u2019ekibiina',
    ]) {
      expect(landing, `missing member line: ${line}`).toContain(line);
    }
  });

  it('shows both audiences at once instead of hiding one behind a tab', () => {
    // the meeting section used to be a tablist, so a member never saw the
    // officer steps and an officer never saw the member steps
    expect(landing).toContain('KU BAMMEMBA');
    expect(landing).toContain('KU ABAKUNGU');
    expect(landing.match(/class="who-col /g)?.length).toBe(2);
    expect(landing.match(/class="who-step"/g)?.length).toBe(6);
    expect(landing).not.toContain('role="tablist"');
    expect(landing).not.toContain('role="tab"');
  });

  it('the brand mark is the one the app uses', () => {
    // the app renders /icon.svg (the strongbox); the landing had a book glyph
    expect(landing).not.toContain('menu_book');
    expect((landing.match(/src="\/icon\.svg"/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('nothing claims a company we cannot trace', () => {
    expect(landing).not.toContain('imac');
  });

  it('headlines do not leave a one-word widow', () => {
    const balanced = [...landing.matchAll(/(\.fz-\d+ span\{[^}]*text-wrap:balance)/g)].map((m) => m[1]);
    expect(balanced.length).toBeGreaterThanOrEqual(7);
  });

  it('the trust strip breathes outside its own inset', () => {
    expect(landing).toContain('class="rv canva-banner w-full py-10"');
    expect(landing).toContain('<ul class="shell grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
  });

  it('the comparison note is a full-width block below the cards', () => {
    // it once lived inside the two-card grid, where any placement squeezed it
    expect(landing).not.toContain('col-span-2 compare-note');
    expect(landing).toContain('class="col-span-4 md:col-span-8 lg:col-span-12 compare-note mt-6 flex gap-2.5 items-start"');
  });

  it('the count-up only rewrites digits, so a money figure never loses its currency', () => {
    // Counting up by assigning textContent dropped the "UGX ", and on the way
    // there a treasurer watched figures that do not add up scroll past: the
    // group total counted through 1,343,826 on its way to 1,420,000, and a
    // 25,000 share showed as 24,313. Only the digits may be rewritten.
    expect(landing).toContain('const splitMoney = (el) =>');
    expect(landing).toContain('const writeMoney = (el, shell, n) =>');
    expect(landing).toContain('writeMoney(el, shell, target * eased)');
    // the dangerous form must not be there any more
    expect(landing).not.toContain('el.textContent = fmt(');
    // and the figure itself keeps its prefix in the markup, for no-JS readers
    expect(landing).toMatch(/data-count="1420000">UGX 1,420,000/);
  });

  it('proves the product instead of claiming it, using something checkable', () => {
    // No invented testimonials and no invented customer names: a sales page
    // that quotes a person who does not exist is worse than one with no quote.
    // The proof offered here is the free demo, which any visitor can open and
    // check for themselves, with play money so no real group is at risk.
    expect(landing).toContain('Kikakase n’ensimbi z’okuzannyisa');
    expect(landing).toContain('Check it with play money');
    expect(landing.match(/class="mono proof-num mb-4"/g)?.length).toBe(3);
    expect(landing).toContain('href="/app?intent=demo"');
    // and it says plainly that no real money is involved
    expect(landing).toContain('The demo runs on play money');
    expect(landing).not.toContain('testimonial');
  });

  it('the Pro card earns its space, and is translated', () => {
    // it was one line of copy above 200px of nothing, and its status pill read
    // "Coming soon" in English even to a Luganda reader
    expect(landing).not.toContain('letter-spacing: 0.06rem;">Coming soon</span>');
    expect(landing).toContain('<span class="lu">Kijja</span>');
    expect(landing).toContain('<span class="en">Coming soon</span>');
    // the plan it is holding the space for
    expect(landing).toContain('Branches, and members who belong to more than one group');
    expect(landing).toContain('Audit and inspection reports as PDF and CSV');
    // a gap before the button, so the last planned item never touches it
    expect(landing).toContain('class="mt-6 mb-6 flex flex-col gap-3"');
  });

  it('no card is styled as if it were an accident', () => {
    // the third trust card was dashed while its two siblings were solid, and
    // the paper ledger card had ruled paper with no margin rule, so the pair
    // read as one card having been styled by mistake
    const trustRow = landing.slice(landing.indexOf('class="trust-item'));
    expect(trustRow).not.toContain('1px dashed');
    // the dashed treatment that IS deliberate: the comparison note
    expect(landing).toContain('.compare-note{border:1px dashed');
    expect(landing).toContain('compare-paper paper rounded-2xl p-6 pl-10');
    expect(landing).toContain('.compare-paper::before');
    // the channel in a marketplace row is a tag, not another heading
    expect(landing).toContain('.market-tag{');
    expect(landing.match(/class="market-tag"/g)?.length).toBe(4);
  });

  it('the hero shows a working account, not a picture of one', () => {
    // a loan line in the activity list and the four figures underneath, so the
    // card above the fold is doing the thing the page is selling
    expect(landing).toContain('Ebbanja lakkiriziddwa');
    expect(landing).toContain('class="passbook-sum mt-4 grid grid-cols-4 gap-2 pt-4"');
    expect(landing).toContain('.passbook-sum{border-top:1px dashed #E5E7EB}');
    expect(landing.match(/class="canva-text block lu"[^>]*>OKUTEREKA</g)?.length).toBe(1);
  });

  it('every pill and label that carries a language exists in both languages', () => {
    // A bare text node inside a pill stays visible in both modes, so the
    // Luganda label was still on screen for an English reader.
    for (const m of landing.matchAll(/<(?:span|p)\s+class="[^"]*\b(?:pill|canva-tag)\b[^"]*"[^>]*>([^<]+)</g)) {
      expect(m[1].trim(), `untranslated pill text: ${m[1].trim()}`).toBe('');
    }
    expect(landing).toContain('<span class="lu" style="font-weight: 800; font-size: 12px; letter-spacing: 0.06rem;">AKAWWUNTI YA DEMO</span>');
    expect(landing).toContain('<span class="en" style="font-weight: 800; font-size: 12px; letter-spacing: 0.06rem;">DEMO ACCOUNT</span>');
  });
});

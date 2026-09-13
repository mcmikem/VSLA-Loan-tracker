import React, { useEffect } from 'react';

const SUPPORT_WHATSAPP = '256772445566';
const waLink = (text: string) => `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;

/**
 * Upgrade #15b — public marketing landing page served at `/`.
 * The working app lives at `/app` (see main.tsx routing).
 */
export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Bakwata VSLA — Village Savings & Loans (Uganda)';
  }, []);

  const features = [
    { icon: 'menu_book', title: 'Digital passbooks', body: 'Every saver\'s stamps, shares and loans — no more lost paper books.' },
    { icon: 'lock', title: '3-key box reconciliation', body: 'Counted cash, dual signatures and padlock sealing, meeting by meeting.' },
    { icon: 'payments', title: 'Loans & welfare', body: '3×-savings appraisal, guarantors, emergency grants and fines.' },
    { icon: 'cloud_sync', title: 'Works fully offline', body: 'No internet in the trading centre? Records save on the phone and sync later.' },
    { icon: 'receipt_long', title: 'Receipts & audit trail', body: 'Printable receipts and an officer-stamped log of every shilling.' },
    { icon: 'translate', title: 'EN · LU · SW', body: 'English, Luganda and Swahili for every member, including elders.' },
  ];

  const steps = [
    { n: '1', title: 'Register your group', body: 'Secretary creates the group in 2 minutes and gets an invite code.' },
    { n: '2', title: 'Invite members', body: 'Members join with the code — passbooks are created automatically.' },
    { n: '3', title: 'Run meetings', body: 'Stamp shares, record loans, seal the box. Print receipts on the spot.' },
  ];

  const faqs = [
    { q: 'Does it work without internet?', a: 'Yes. It is offline-first — records live on the phone and sync when you are back online.' },
    { q: 'How much does it cost?', a: 'Free during the pilot for groups up to 30 members. Pro (500 members, priority support, cloud sync) is coming soon.' },
    { q: 'Is our money kept in the app?', a: 'No. Cash stays in your physical strongbox. The app keeps the books — who saved, who borrowed, what is in the box.' },
    { q: 'Which phones work?', a: 'Any Android with Chrome or iPhone with Safari. Tap “Add to Home Screen” and it opens like a normal app.' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7F6] text-[#141b2b] font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#F6F7F6]/90 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="Bakwata VSLA" className="w-9 h-9" />
            <span className="font-bold text-[#00261b]">Bakwata VSLA</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#4B5563]">
            <a href="#features" className="hover:text-[#00261b]">Features</a>
            <a href="#how" className="hover:text-[#00261b]">How it works</a>
            <a href="#pricing" className="hover:text-[#00261b]">Pricing</a>
            <a href="#faq" className="hover:text-[#00261b]">FAQ</a>
          </nav>
          <a
            href="/app"
            className="px-4 py-2.5 bg-[#00261b] text-white rounded-lg text-sm font-bold hover:bg-[#0b3d2e] active:scale-95"
          >
            Open the App
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-10 md:pt-20 md:pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#006d30] animate-pulse" />
            Offline-first · English · Luganda · Swahili
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-[#00261b] leading-tight mt-4">
            The digital strongbox for village savings groups
          </h1>
          <p className="text-[#4B5563] mt-4 leading-relaxed">
            Bakwata VSLA replaces the paper ledger: stamp shares, approve loans, seal the box
            with 3 keys — all from one phone, even without internet. <em>Tukwatagane, tukule.</em>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <a
              href="/app"
              className="flex-1 sm:flex-none px-6 py-3.5 bg-[#006d30] text-white rounded-lg font-bold text-center hover:bg-emerald-700 active:scale-[0.99]"
            >
              Open the App — Free
            </a>
            <a
              href={waLink('Hello! I want to register my savings group on Bakwata VSLA.')}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none px-6 py-3.5 bg-white border-2 border-[#00261b] text-[#00261b] rounded-lg font-bold text-center active:scale-[0.99]"
            >
              Talk to us on WhatsApp
            </a>
          </div>
          <div className="flex gap-6 mt-6 text-xs text-[#4B5563]">
            <span><strong className="text-[#00261b] font-mono">3</strong> languages</span>
            <span><strong className="text-[#00261b] font-mono">100%</strong> offline-ready</span>
            <span><strong className="text-[#00261b] font-mono">0</strong> fees to start</span>
          </div>
        </div>

        {/* Product mock */}
        <div className="bg-[#0b3d2e] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[160px]">account_balance</span>
          </div>
          <p className="text-xs uppercase tracking-wider text-[#bcedd7] font-bold">Group vault · Kalerwe Market</p>
          <p className="font-mono text-4xl font-bold mt-2">UGX 1,420,000</p>
          <p className="text-xs text-[#c0c8c3] mt-1">Physical box cash · verified by 3 keyholders</p>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-[11px] text-[#c0c8c3]">Loan fund</p>
              <p className="font-mono font-bold">UGX 9,950,000</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-[11px] text-[#c0c8c3]">Welfare fund</p>
              <p className="font-mono font-bold">UGX 790,000</p>
            </div>
          </div>
          <div className="mt-4 bg-white/10 rounded-lg p-3 flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[#95f8a7]">verified</span>
            Meeting #28 closed &amp; reconciled · 28/30 present
          </div>
        </div>
      </section>

      {/* Paper vs Bakwata */}
      <section className="bg-white border-y border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-[#00261b] text-center">Why groups leave the paper book</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
            <div className="rounded-xl border border-[#E5E7EB] p-5">
              <p className="font-bold text-[#4B5563] uppercase text-xs tracking-wider mb-3">Paper ledger</p>
              <ul className="space-y-2.5 text-[#4B5563]">
                <li>✕ Books get lost, torn or rained on</li>
                <li>✕ Only the secretary can read the handwriting</li>
                <li>✕ Share-out maths takes a whole day</li>
                <li>✕ No proof when money goes missing</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-[#006d30] p-5 bg-[#DCFCE7]/30">
              <p className="font-bold text-[#006d30] uppercase text-xs tracking-wider mb-3">Bakwata VSLA</p>
              <ul className="space-y-2.5">
                <li>✓ Records backed up &amp; exportable anytime</li>
                <li>✓ Every member sees their own passbook</li>
                <li>✓ One-tap share-out with loan deductions</li>
                <li>✓ Officer-stamped audit trail of every shilling</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-[#00261b] text-center">Everything a meeting needs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
              <span className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#006d30] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">{f.icon}</span>
              </span>
              <h3 className="font-bold mt-3">{f.title}</h3>
              <p className="text-sm text-[#4B5563] mt-1">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[#00261b] text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center">Running in one meeting</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {steps.map((s) => (
              <div key={s.n} className="bg-white/10 rounded-xl p-5 border border-white/15">
                <span className="font-mono text-3xl font-bold text-[#95f8a7]">{s.n}</span>
                <h3 className="font-bold mt-2">{s.title}</h3>
                <p className="text-sm text-white/80 mt-1">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href="/app" className="inline-block px-8 py-3.5 bg-[#006d30] rounded-lg font-bold hover:bg-emerald-600 active:scale-[0.99]">
              Register your group now
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-[#00261b] text-center">Simple pricing</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border-2 border-[#006d30] p-6 shadow-sm">
            <p className="font-bold text-[#006d30] uppercase text-xs tracking-wider">Pilot — Free</p>
            <p className="font-mono text-3xl font-bold mt-2">UGX 0</p>
            <ul className="text-sm space-y-2 mt-4 text-[#4B5563]">
              <li>✓ Up to 30 members</li>
              <li>✓ Passbooks, loans, welfare &amp; fines</li>
              <li>✓ Receipts, reports &amp; audit trail</li>
              <li>✓ Offline-first + backups</li>
            </ul>
            <a href="/app" className="block text-center mt-5 px-4 py-3 bg-[#006d30] text-white rounded-lg font-bold">Start free</a>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="font-bold text-[#4B5563] uppercase text-xs tracking-wider">Pro / SACCO — Soon</p>
            <p className="font-mono text-3xl font-bold mt-2">Talk to us</p>
            <ul className="text-sm space-y-2 mt-4 text-[#4B5563]">
              <li>✓ Up to 500+ members</li>
              <li>✓ Shared cloud database across phones</li>
              <li>✓ MTN/Airtel money collection</li>
              <li>✓ Priority WhatsApp support</li>
            </ul>
            <a href={waLink('Hello! I want Pro for my savings group.')} target="_blank" rel="noreferrer" className="block text-center mt-5 px-4 py-3 border-2 border-[#00261b] text-[#00261b] rounded-lg font-bold">Join the waitlist</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white border-y border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-[#00261b] text-center">Questions groups ask</h2>
          <div className="space-y-3 mt-6">
            {faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-[#E5E7EB] p-4 group">
                <summary className="font-bold text-sm cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="material-symbols-outlined text-[#4B5563]">expand_more</span>
                </summary>
                <p className="text-sm text-[#4B5563] mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA + footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-[#00261b]">Bring your group onto Bakwata this Friday</h2>
        <p className="text-[#4B5563] mt-2">Free during the pilot · Set up in one meeting · Tugende!</p>
        <a href="/app" className="inline-block mt-5 px-8 py-3.5 bg-[#00261b] text-white rounded-lg font-bold hover:bg-[#0b3d2e]">Open the App</a>
        <div className="flex justify-center gap-5 mt-8 text-xs text-[#4B5563] font-semibold">
          <a href="/app" className="hover:text-[#00261b]">Open App</a>
          <a href={waLink('Hello Bakwata VSLA support!')} target="_blank" rel="noreferrer" className="hover:text-[#00261b]">Support</a>
          <a href="/app" className="hover:text-[#00261b]">Terms &amp; Privacy</a>
        </div>
        <p className="text-[11px] text-[#4B5563] mt-4 font-mono">Bakwata VSLA · Kampala, Uganda · v1.4.0</p>
      </footer>
    </div>
  );
};

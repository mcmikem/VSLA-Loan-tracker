import React, { useEffect } from 'react';

const SUPPORT_WHATSAPP = '256772445566';
const waLink = (text: string) => `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;

/**
 * VSLA UG marketing homepage — designed to sell to Ugandan groups:
 * UGX-first hero, Luganda voice, WhatsApp CTAs, honest pricing.
 * The working app lives at `/app` (see main.tsx routing).
 */
export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'VSLA UG — Village Savings and Loaning Application';
  }, []);

  const features = [
    { icon: 'menu_book', title: 'Digital passbooks', body: 'Every saver\'s stamps, shares and loans. No more lost, torn or rained-on books.' },
    { icon: 'lock', title: '3-key box reconciliation', body: 'Counted cash, dual signatures and padlock sealing — every single meeting.' },
    { icon: 'payments', title: 'Loans that enforce themselves', body: '3×-savings limit, guarantors, service charge and automatic deductions at share-out.' },
    { icon: 'health_and_safety', title: 'Welfare & fines', body: 'Emergency grants with approvals, plus constitutional fines that collect themselves.' },
    { icon: 'receipt_long', title: 'Receipts, reports & audit', body: 'Print a receipt on the spot. Export CSV. An officer-stamped log of every shilling.' },
    { icon: 'cloud_sync', title: 'Works fully offline', body: 'No internet in the trading centre? Records save on the phone and sync later.' },
  ];

  const steps = [
    { n: '01', title: 'Register in 2 minutes', body: 'The secretary creates the group and gets an invite code. Free.' },
    { n: '02', title: 'Members join with the code', body: 'Each member opens the app, enters the code — passbook created automatically.' },
    { n: '03', title: 'Run Friday meeting', body: 'Stamp shares, record loans, seal the box. Print receipts before anyone leaves.' },
  ];

  const faqs = [
    { q: 'Ssente zaffe ziba wa? Where does our money stay?', a: 'In your physical strongbox — always. VSLA UG only keeps the books: who saved, who borrowed, what is in the box. We never touch your cash.' },
    { q: 'Does it work without internet?', a: 'Yes. It is offline-first — records live on the phone and sync when you are back online. Download a backup after every meeting.' },
    { q: 'How much does it cost?', a: 'Free during the pilot for groups up to 30 members. Pro (500 members, shared cloud database, mobile-money collection) is coming — join the waitlist on WhatsApp.' },
    { q: 'Which phones work?', a: 'Any Android with Chrome or iPhone with Safari. Tap “Add to Home Screen” and it opens like a normal app. English and Luganda inside.' },
    { q: 'What if the secretary’s phone is lost?', a: 'Download the JSON backup after every meeting (Backup & Audit). Any officer restores it on a new phone in one minute.' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7F6] text-[#141b2b] font-sans pb-20 md:pb-0">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#00261b] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="VSLA UG" className="w-9 h-9 rounded-lg" />
            <span className="leading-tight">
              <span className="block font-bold">VSLA UG</span>
              <span className="block text-[10px] text-[#bcedd7] font-medium">Village Savings &amp; Loaning App</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/80">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <a
            href="/app"
            className="px-4 py-2.5 bg-[#EAB308] text-[#00261b] rounded-lg text-sm font-bold hover:bg-yellow-400 active:scale-95"
          >
            Open App — Free
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#00261b] text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#bcedd7] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
              Piloting with Kampala savings groups
            </span>
            <h1 className="text-4xl md:text-[52px] font-bold leading-[1.05] mt-4">
              Ssente zo, <span className="text-[#EAB308]">ntegeera</span> yo.
              <span className="block text-2xl md:text-3xl mt-2 text-white/90 font-semibold">Your money, fully accounted.</span>
            </h1>
            <p className="text-white/75 mt-4 leading-relaxed max-w-md">
              VSLA UG is the record-keeper for village savings groups: digital passbooks,
              3-key box counts, loans, welfare and receipts — on one phone, even offline.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <a
                href="/app"
                className="px-6 py-3.5 bg-[#EAB308] text-[#00261b] rounded-lg font-bold text-center hover:bg-yellow-400 active:scale-[0.99]"
              >
                Start free this Friday
              </a>
              <a
                href={waLink('Hello VSLA UG! I want to register my savings group.')}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 border-2 border-white/40 rounded-lg font-bold text-center hover:border-white active:scale-[0.99]"
              >
                WhatsApp us
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-6 text-xs text-white/70">
              <span><strong className="text-white font-mono">UGX 0</strong> to start</span>
              <span><strong className="text-white font-mono">2</strong> languages</span>
              <span><strong className="text-white font-mono">0</strong> internet needed</span>
            </div>
          </div>

          {/* Phone mock */}
          <div className="mx-auto w-[280px] rounded-[32px] border-[10px] border-black bg-[#F6F7F6] shadow-2xl overflow-hidden">
            <div className="bg-[#00261b] text-white px-4 pt-4 pb-3">
              <p className="text-[10px] text-[#bcedd7] font-bold uppercase">VSLA UG · Kalerwe Market</p>
              <p className="font-mono text-2xl font-bold mt-1">UGX 1,420,000</p>
              <p className="text-[10px] text-white/70">Box cash · verified by 3 keyholders</p>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2.5 border border-[#E5E7EB]">
                  <p className="text-[10px] text-[#4B5563]">Loan fund</p>
                  <p className="font-mono text-xs font-bold">UGX 9.95M</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-[#E5E7EB]">
                  <p className="text-[10px] text-[#4B5563]">Welfare</p>
                  <p className="font-mono text-xs font-bold">UGX 790K</p>
                </div>
              </div>
              {['Sarah N. · 5 shares stamped', 'Joseph M. · repaid UGX 40,000', 'Meeting #28 sealed ✓'].map((r) => (
                <div key={r} className="bg-white rounded-lg px-2.5 py-2 border border-[#E5E7EB] text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#006d30]">check_circle</span>
                  {r}
                </div>
              ))}
              <div className="bg-[#006d30] text-white rounded-lg py-2.5 text-center text-xs font-bold">
                Start Weekly Meeting
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-5xl mx-auto px-4 py-3 text-center text-[11px] tracking-[0.2em] text-white/50 font-bold">
            VSLA · SACCO · ROSCA · INVESTMENT CLUBS · WELFARE GROUPS
          </p>
        </div>
      </section>

      {/* Paper vs VSLA UG */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-[#00261b] text-center">Why groups burn the paper book</h2>
        <p className="text-center text-[#4B5563] text-sm mt-2">Emirimu gyonna egy’ekibiina — ku ssimu emu.</p>
        <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <p className="font-bold text-[#4B5563] uppercase text-xs tracking-wider mb-3">Paper ledger</p>
            <ul className="space-y-2.5 text-[#4B5563]">
              <li>✕ Books get lost, torn or rained on</li>
              <li>✕ Only the secretary can read the handwriting</li>
              <li>✕ Share-out maths eats a whole Saturday</li>
              <li>✕ No proof when cash goes missing</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-[#006d30] p-5 bg-[#DCFCE7]/40">
            <p className="font-bold text-[#006d30] uppercase text-xs tracking-wider mb-3">VSLA UG</p>
            <ul className="space-y-2.5 font-medium">
              <li>✓ Backed up &amp; exportable after every meeting</li>
              <li>✓ Each member sees their own passbook</li>
              <li>✓ One-tap share-out with loan deductions</li>
              <li>✓ Officer-stamped audit trail of every shilling</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-y border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-[#00261b] text-center">Everything a Friday meeting needs</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-[#E5E7EB] p-5 hover:border-[#006d30] transition">
                <span className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#006d30] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">{f.icon}</span>
                </span>
                <h3 className="font-bold mt-3">{f.title}</h3>
                <p className="text-sm text-[#4B5563] mt-1">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-[#00261b] text-center">Live in one meeting</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {steps.map((s) => (
            <div key={s.n} className="bg-[#00261b] text-white rounded-xl p-5">
              <span className="font-mono text-3xl font-bold text-[#EAB308]">{s.n}</span>
              <h3 className="font-bold mt-2">{s.title}</h3>
              <p className="text-sm text-white/75 mt-1">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white border-y border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-[#00261b] text-center">Simple pricing, in shillings</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl border-2 border-[#006d30] p-6 shadow-sm bg-[#DCFCE7]/20">
              <p className="font-bold text-[#006d30] uppercase text-xs tracking-wider">Pilot — Free</p>
              <p className="font-mono text-4xl font-bold mt-2">UGX 0</p>
              <p className="text-xs text-[#4B5563]">per group, forever in pilot</p>
              <ul className="text-sm space-y-2 mt-4 text-[#4B5563]">
                <li>✓ Up to 30 members</li>
                <li>✓ Passbooks, loans, welfare &amp; fines</li>
                <li>✓ Receipts, reports &amp; audit trail</li>
                <li>✓ Offline-first + backups</li>
              </ul>
              <a href="/app" className="block text-center mt-5 px-4 py-3 bg-[#006d30] text-white rounded-lg font-bold">Start free</a>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] p-6">
              <p className="font-bold text-[#4B5563] uppercase text-xs tracking-wider">Pro / SACCO — Soon</p>
              <p className="font-mono text-4xl font-bold mt-2">Talk to us</p>
              <p className="text-xs text-[#4B5563]">priced per group, MTN MoMo accepted</p>
              <ul className="text-sm space-y-2 mt-4 text-[#4B5563]">
                <li>✓ Up to 500+ members</li>
                <li>✓ Shared cloud database across phones</li>
                <li>✓ Mobile-money collection</li>
                <li>✓ Priority WhatsApp support</li>
              </ul>
              <a href={waLink('Hello VSLA UG! I want Pro for my savings group.')} target="_blank" rel="noreferrer" className="block text-center mt-5 px-4 py-3 border-2 border-[#00261b] text-[#00261b] rounded-lg font-bold">Join the waitlist</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-[#00261b] text-center">Groups ask us</h2>
        <div className="space-y-3 mt-6">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <summary className="font-bold text-sm cursor-pointer list-none flex justify-between items-center gap-2">
                {f.q}
                <span className="material-symbols-outlined text-[#4B5563]">expand_more</span>
              </summary>
              <p className="text-sm text-[#4B5563] mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#00261b] text-white">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Bring your group on board this Friday</h2>
          <p className="text-white/70 mt-2">Free in pilot · Set up in one meeting · Tugende!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <a href="/app" className="px-8 py-3.5 bg-[#EAB308] text-[#00261b] rounded-lg font-bold hover:bg-yellow-400">Open the App</a>
            <a href={waLink('Hello VSLA UG!')} target="_blank" rel="noreferrer" className="px-8 py-3.5 border-2 border-white/40 rounded-lg font-bold hover:border-white">WhatsApp Us</a>
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-bold text-[#00261b]">
            <img src="/icon.svg" alt="" className="w-7 h-7" /> VSLA UG
          </span>
          <div className="flex gap-5 text-xs font-semibold text-[#4B5563]">
            <a href="/app" className="hover:text-[#00261b]">Open App</a>
            <a href={waLink('Hello VSLA UG support!')} target="_blank" rel="noreferrer" className="hover:text-[#00261b]">Support</a>
            <a href="/app" className="hover:text-[#00261b]">Terms &amp; Privacy</a>
          </div>
        </div>
        <p className="text-center text-[11px] text-[#4B5563] mt-4 font-mono">VSLA UG · Village Savings and Loaning Application · Kampala, Uganda</p>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur border-t border-[#E5E7EB] p-3 flex gap-2">
        <a href="/app" className="flex-1 py-3 bg-[#006d30] text-white rounded-lg font-bold text-sm text-center active:scale-[0.99]">
          Open App — Free
        </a>
        <a href={waLink('Hello VSLA UG!')} target="_blank" rel="noreferrer" className="px-4 py-3 border-2 border-[#00261b] text-[#00261b] rounded-lg font-bold text-sm active:scale-[0.99]">
          WhatsApp
        </a>
      </div>
    </div>
  );
};

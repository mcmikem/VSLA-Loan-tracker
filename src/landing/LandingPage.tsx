import React, { useEffect, useRef, useState } from 'react';
import { PhoneDemo, DemoLang } from './PhoneDemo';

const SUPPORT_WHATSAPP = '256772445566';
const waLink = (text: string) => `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;

type Lang = 'EN' | 'LU';

/**
 * VSLA UG marketing homepage — written for members AND secretaries,
 * not investors. Concrete Friday scenes (animated from the real app UI),
 * honest pricing, Luganda-first. No gradients, no hype verbs, no fake stats.
 */
export const LandingPage: React.FC = () => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem('vsla_lang');
      return s === 'EN' || s === 'LU' ? s : 'LU';
    } catch {
      return 'LU';
    }
  });
  const pick = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('vsla_lang', l);
    } catch {}
  };
  const lu = lang === 'LU';

  useEffect(() => {
    document.title = 'VSLA UG — Village Savings and Loaning Application';
  }, []);

  const faqs: { q: string; a: string }[] = lu
    ? [
        { q: 'Ssente zaffe ziba wa?', a: 'Mu sanduuko yammwe ey\'ekyuma — bulijjo. VSLA UG ekuuma bbaluwa zokka: ani yatereka, ani yeewola, ssente mmeka eziri mu sanduuko. Tetukwata ku nsimbi zammwe n\'akamu.' },
        { q: 'Nsobola okulaba nterekanya yange ku ssimu yange?', a: 'Yee. Buli mukiise alina Akawunti kange: nterekanya yo, bbanja lyo, ebyewolo byosabye (0/2, 1/2, kyakkiriziddwa) ne bizinesi z’abakiise banno. Saba ekyewolo okuva ku ssimu yo — abakulu babiri be bakkiriza.' },
        { q: 'Ekibiina kisobola okutereka ssente ku MoMo oba banka?', a: 'Yee — kye kyetumeezza. App eraga awali ssente: nkalu mu sanduuko, MoMo float, banka. Buli kukyusa kuwandiikibwa n’akola audit. Ku lukuŋŋaana mubala nkalu zokka.' },
        { q: 'Nsobola okutunda ebintu byange mu kibiina?', a: 'Yee. Wandiisa ebintu oba omulembe (kutunga, bodaboda, salon) mu kaduuka k’ekibiina. Abakiise bakugulako ne SMS oba WhatsApp — ssente zijja gyoli, ekibiina kikula.' },
        { q: 'Ekola awatali yintaneeti?', a: 'Yee. Ebiwandiiko bibeera ku ssimu era bisinkana bw\'odda ku mutimbagano. Koppa backup (fayiro) oluvannyuma lwa buli lukuŋŋaana.' },
        { q: 'Mmewendo gwa mmeka?', a: 'Mawa mu pilot okutuuka ku bakiise 30. Pro (abakiise 500, database emu, MoMo) ejja — yingira ku lukalala lwa WhatsApp.' },
        { q: 'Ssimu ki ezikola?', a: 'Android yonna ne Chrome oba iPhone ne Safari. Nyiga “Add to Home Screen” n\'eggulawo nga app entuufu. Oluzungu n\'Oluganda munda.' },
        { q: 'Ssimu y\'omuwandiisi bw\'ebula?', a: 'Koppa fayiro ya backup buli lukuŋŋaana (Backup & Audit). Omukulu omulala agizzaawo ku ssimu empya mu ddakiika emu. Era kuba olupapula lw\'okuzzaawo — oluterekeddwa mu sanduuko.' },
      ]
    : [
        { q: 'Ssente zaffe ziba wa? Where does our money stay?', a: 'In your physical strongbox — always. VSLA UG only keeps the books: who saved, who borrowed, what is in the box. We never touch your cash.' },
        { q: 'Can I see my own savings on my phone?', a: 'Yes. Every member gets My account: your savings, your loan, your requests (0/2, 1/2, approved) and neighbours’ businesses. Request a loan from your own phone — two officers still approve it.' },
        { q: 'Can the group keep money on MoMo or a bank?', a: 'Yes — your choice. The app shows where money sits: box cash, MoMo float, bank. Every move is recorded and audited. At meetings you count physical cash only.' },
        { q: 'Can I sell my goods in the group?', a: 'Yes. List products or services (tailoring, bodaboda, salon) in the group shop. Members buy from you over SMS or WhatsApp — money comes to you, the group grows.' },
        { q: 'Does it work without internet?', a: 'Yes. Records live on the phone and sync when you are back online. Download a backup after every meeting.' },
        { q: 'How much does it cost?', a: 'Free during the pilot for groups up to 30 members. Pro (500 members, shared cloud database, mobile-money collection) is coming — join the waitlist on WhatsApp.' },
        { q: 'Which phones work?', a: 'Any Android with Chrome or iPhone with Safari. Tap “Add to Home Screen” and it opens like a normal app. English and Luganda inside.' },
        { q: 'What if the secretary’s phone is lost?', a: 'Download the JSON backup after every meeting (Backup & Audit). Any officer restores it on a new phone in one minute. Print the recovery sheet too — it lives in the box, not the phone.' },
      ];

  const steps = lu
    ? [
        { n: '01', title: 'Teeka sitampu', body: 'Sarah agula emigabo 3 ku 10k. Ssimu ekoze okubala; ekitabo ekikalu kifuna sitampu.' },
        { n: '02', title: 'Siba sanduuko', body: 'Ssente ezibaliddwa zirina okuringa eziri mu kitabo. Ebisumuluzo 3 bikyuka, oba olukuŋŋaana teggala.' },
        { n: '03', title: 'Abakulu babiri bakkiriza', body: '600,000 efuluma abakulu babiri abenjawulo bwe bakkiriza — buli omu ne PIN ye.' },
      ]
    : [
        { n: '01', title: 'Stamp shares', body: 'Sarah buys 3 shares at 10k. The phone does the maths; the paper book gets the stamp.' },
        { n: '02', title: 'Seal the box', body: 'Counted cash must match the book. Three keys turn, or the meeting does not close.' },
        { n: '03', title: 'Two keys approve', body: '600,000 moves only when two different officers sign — each with their own PIN.' },
      ];

  const memberCards = lu
    ? [
        { icon: 'savings', t: 'Enterekanya yange', b: 'Sarah alaba UGX 450,000 ze yatereka — awatali kusaba muwandiisi amusomere.' },
        { icon: 'add_card', t: 'Saba ku ssimu yo', b: 'Joseph asaba 600,000 ku ssimu ye. Alondoola 0/2 → 1/2 → kyakkiriziddwa.' },
        { icon: 'storefront', t: 'Gula eri munno', b: 'Prossy atunga; Kato avuga bodaboda. Nyiga, weereza SMS, ssente zijja.' },
      ]
    : [
        { icon: 'savings', t: 'My savings, visible', b: 'Sarah sees her UGX 450,000 saved — no begging the secretary to read.' },
        { icon: 'add_card', t: 'Request on my phone', b: 'Joseph requests 600,000 from his phone. Tracks 0/2 → 1/2 → approved.' },
        { icon: 'storefront', t: 'Buy from neighbours', b: 'Prossy tailors; Kato rides bodaboda. Tap, send SMS, money moves.' },
      ];

  const officerTools = lu
    ? [
        { icon: 'print', t: 'Olupapula lw’okukunganyiza', b: 'Kuba ng’olukuŋŋaana tekunnatandika; jjuza ne kalamu. Amabanja n’engassi biggyiddwa mu kitabo.' },
        { icon: 'sms', t: 'SMS eri abeebbanja', b: 'Buli bbanja lifuna SMS eyakyo mu Luganda — namba ne muwendo biggyiddwa mu kitabo. Mawa.' },
        { icon: 'account_balance', t: 'Nkalu · MoMo · Banka', b: 'Ssente we ziri zirabika. Buli kukyusa kuwandiikibwa. Mubala nkalu zokka.' },
        { icon: 'sports_esports', t: 'Yiga na ssente za kuzannya', b: 'Ekibiina eky’ekigezo (abakiise 5). Weeyigire — tewali ddala ekikwatibwako.' },
      ]
    : [
        { icon: 'print', t: 'Printable collection sheet', b: 'Print before the meeting; fill by pen. Debts and fines pulled from the book.' },
        { icon: 'sms', t: 'SMS to debtors', b: 'Each debtor gets a personal SMS in Luganda — number and balance from the book. Free.' },
        { icon: 'account_balance', t: 'Cash · MoMo · Bank', b: 'Every shilling located. Every move audited. Count physical cash only.' },
        { icon: 'sports_esports', t: 'Practice with play money', b: 'Fake 5-member group. Learn safely — nothing real moves.' },
      ];

  return (
    <div className="min-h-screen bg-[#F6F7F6] text-[#141b2b] font-sans pb-20 md:pb-0">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#00261b] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <a href="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="VSLA UG" className="w-9 h-9 rounded-lg" />
            <span className="leading-tight">
              <span className="block font-bold">VSLA UG</span>
              <span className="block text-[10px] text-[#bcedd7] font-medium">
                {lu ? 'Ensimbi z’Abatuuze' : 'Village Savings & Loans'}
              </span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/80">
            <a href="#members" className="hover:text-white">{lu ? 'Abakiise' : 'Members'}</a>
            <a href="#market" className="hover:text-white">{lu ? 'Akatuuka' : 'Market'}</a>
            <a href="#how" className="hover:text-white">{lu ? 'Lwokutaano' : 'Friday flow'}</a>
            <a href="#pricing" className="hover:text-white">{lu ? 'Emiwendo' : 'Pricing'}</a>
            <a href="#faq" className="hover:text-white">{lu ? 'Ebibuuzo' : 'Questions'}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-white/25 text-xs font-bold" role="group" aria-label="Language">
              {(['EN', 'LU'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => pick(l)}
                  className={`px-2.5 py-2 active:scale-95 transition ${lang === l ? 'bg-[#EAB308] text-[#00261b]' : 'text-white/70 hover:text-white'}`}
                >
                  {l === 'EN' ? 'EN' : 'LU'}
                </button>
              ))}
            </div>
            <a
              href="/app"
              className="px-4 py-2.5 bg-[#EAB308] text-[#00261b] rounded-lg text-sm font-bold hover:bg-yellow-400 active:scale-95 transition"
            >
              {lu ? 'Ggulawo App' : 'Open App — Free'}
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#00261b] text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-12 md:pt-16 md:pb-20 grid md:grid-cols-2 gap-10 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#bcedd7] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
              {lu ? 'Kyakolebwa n’ebibiina by’e Kampala' : 'Built with Kampala savings groups'}
            </span>
            <h1 className="text-4xl md:text-[52px] font-bold leading-[1.05] mt-4">
              Ssente zo, <span className="text-[#EAB308]">ntegeera</span> yo.
              <span className="block text-2xl md:text-3xl mt-2 text-white/90 font-semibold">
                {lu ? 'Ssente zammwe, zibalibwa mu lwatu.' : 'Your money, counted in the open.'}
              </span>
            </h1>
            <p className="text-white/75 mt-4 leading-relaxed max-w-md">
              {lu
                ? 'Buli mukiise alaba nterekanya ye ku ssimu ye; omuwandiisi akuuma bbaluwa — ku ssimu emu, n’awatali yintaneeti.'
                : 'Every member sees their savings on their phone; the secretary keeps the books — on one phone, even offline.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <a
                href="/app"
                className="px-6 py-3.5 bg-[#EAB308] text-[#00261b] rounded-lg font-bold text-center hover:bg-yellow-400 active:scale-[0.99] transition"
              >
                {lu ? 'Tandika Lwokutaano luno — mawa' : 'Start free this Friday'}
              </a>
              <a
                href={waLink(lu ? 'Tusaba VSLA UG! Twagala kuwandiisa ekibiina kyaffe.' : 'Hello VSLA UG! I want to register my savings group.')}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 border-2 border-white/40 rounded-lg font-bold text-center hover:border-white active:scale-[0.99] transition"
              >
                WhatsApp
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-6 text-xs text-white/70">
              <span><strong className="text-white font-mono">UGX 0</strong> {lu ? 'okutandika' : 'to start'}</span>
              <span><strong className="text-white">LU + EN</strong></span>
              <span><strong className="text-white font-mono">0</strong> {lu ? 'yintaneeti yeetaagisa' : 'internet needed'}</span>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <PhoneDemo lang={lang as DemoLang} />
            <p className="text-center text-[11px] text-white/50 mt-2">
              {lu ? 'Nyiga ennamba waggulu olabe buli mutendera' : 'Tap the numbers above to walk each step'}
            </p>
          </Reveal>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-5xl mx-auto px-4 py-3 text-center text-[11px] tracking-[0.2em] text-white/50 font-bold">
            VSLA · SACCO · INVESTMENT CLUBS · WELFARE GROUPS
          </p>
        </div>
      </section>

      {/* For every member — not just the secretary */}
      <section id="members" className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d30]">
            {lu ? 'Si muwandiisi yekka' : 'Not just the secretary'}
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-[#00261b] mt-2">
            {lu ? 'Buli mukiise alina akawunti ke' : 'Every member gets an account'}
          </h2>
          <p className="text-[#4B5563] text-sm mt-2 max-w-xl mx-auto">
            {lu
              ? 'Tewakyali kusaba muwandiisi akusomere. Ggulawo ssimu yo: nterekanya, bbanja, ebyewolo byosabye.'
              : 'No more begging the secretary to read for you. Open your phone: savings, loan, requested loans.'}
          </p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {memberCards.map((c, i) => (
            <Reveal key={c.t} delay={i * 100}>
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 h-full hover:-translate-y-1 transition-transform">
                <span className="w-11 h-11 rounded-xl bg-[#00261b] text-[#EAB308] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">{c.icon}</span>
                </span>
                <h3 className="font-bold mt-3 text-lg text-[#00261b]">{c.t}</h3>
                <p className="text-sm text-[#4B5563] mt-1 leading-relaxed">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Group market — buy from each other */}
      <section id="market" className="bg-[#FFF8E1] border-y border-[#F5D67B]">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#854D0E]">
              {lu ? 'Akatuuka k’ekibiina' : 'The group market'}
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-[#00261b] mt-2 leading-tight">
              {lu ? 'Tundanagane — ekibiina kikule.' : 'Buy from each other — grow together.'}
            </h2>
            <p className="text-sm text-[#4B5563] mt-3 leading-relaxed">
              {lu
                ? 'Wandiisa ebyobulimi, emmere, okutunga, bodaboda oba salon. Abakiise bakugulako ne SMS oba WhatsApp — ssente zijja gyoli, so si mu kibiina.'
                : 'List farm produce, cooked food, tailoring, bodaboda or salon services. Members buy from you over SMS or WhatsApp — money comes to you, not the group.'}
            </p>
            <div className="space-y-3 mt-6">
              {[
                { t: lu ? 'Ebintu n’omulembe' : 'Goods and services', b: lu ? 'Kasava, obutunda, kutunga, bodaboda — byonna bisoboka.' : 'Cassava, flour, tailoring, rides — all welcome.' },
                { t: lu ? 'Okugula kwa taps ibiri' : 'Two-tap buying', b: lu ? 'Nyiga, weereza SMS etegerekeddwa dda. Tewali app empya.' : 'Tap, send a pre-written SMS. No new app to learn.' },
                { t: lu ? 'Ssente zijja gyoli' : 'Money comes to you', b: lu ? 'Okutunda kw’abakiise tekukwata ku sanduuko — kwa bizinesi yo.' : 'Member sales never touch the box — they feed your business.' },
              ].map((r) => (
                <div key={r.t} className="flex gap-3 bg-white/70 rounded-xl p-3.5 border border-[#EAD9A0]">
                  <span className="w-10 h-10 rounded-lg bg-[#00261b] text-[#EAB308] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">storefront</span>
                  </span>
                  <div>
                    <p className="font-bold text-sm text-[#00261b]">{r.t}</p>
                    <p className="text-xs text-[#4B5563] mt-0.5">{r.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="bg-[#00261b] text-white rounded-2xl p-6 md:p-8 shadow-xl space-y-3">
              {[
                ['Kasava 10kg', 'Nakato · UGX 25,000', '🌾'],
                [lu ? 'Okutunga (gomesi)' : 'Tailoring (gomesi)', 'Prossy · UGX 15,000/session', '✂️'],
                ['Bodaboda — Kalerwe', 'Kato · UGX 3,000/trip', '🏍️'],
              ].map(([name, seller, emoji]) => (
                <div key={name} className="flex items-center gap-3 bg-white/10 rounded-xl p-3.5 border border-white/10">
                  <span className="text-2xl">{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{name}</p>
                    <p className="text-[11px] text-white/60 font-mono">{seller}</p>
                  </div>
                  <span className="px-3 py-1.5 bg-[#EAB308] text-[#00261b] rounded-lg text-xs font-bold shrink-0">
                    {lu ? 'Gula' : 'Buy'}
                  </span>
                </div>
              ))}
              <p className="text-[11px] text-white/60 leading-relaxed pt-1">
                {lu
                  ? 'Bino byonna biva mu kaduuka k’ekibiina — abakiise bennyini.'
                  : 'All of this lives in the group shop — listed by members themselves.'}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Friday flow — for officers */}
      <section id="how" className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#006d30]">
            {lu ? 'Abakulu: Lwokutaano lumu, emitendera esatu' : 'Officers: one Friday, three moves'}
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-[#00261b] mt-2">
            {lu ? 'Bw’ekola ku lukuŋŋaana' : 'How a meeting runs on it'}
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="bg-[#00261b] text-white rounded-2xl p-6 h-full hover:-translate-y-1 transition-transform">
                <span className="font-mono text-4xl font-bold text-[#EAB308]">{s.n}</span>
                <h3 className="font-bold mt-2 text-lg">{s.title}</h3>
                <p className="text-sm text-white/75 mt-1 leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {/* Officer toolkit */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {officerTools.map((c, i) => (
            <Reveal key={c.t} delay={i * 80}>
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 h-full">
                <span className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#006d30] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">{c.icon}</span>
                </span>
                <h3 className="font-bold mt-2.5 text-sm text-[#00261b]">{c.t}</h3>
                <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Money stays home */}
      <section className="bg-[#FFF8E1] border-y border-[#F5D67B]">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#854D0E]">
              {lu ? 'Ekikulu okusinga' : 'The main thing'}
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-[#00261b] mt-2 leading-tight">
              {lu ? 'Ssente zibeera mu sanduuko. App ekuuma bbaluwa zokka.' : 'Your cash never leaves the box. The app only keeps the books.'}
            </h2>
            <div className="space-y-3 mt-6">
              {[
                { icon: 'cloud_sync', t: lu ? 'Ekola awatali yintaneeti' : 'Works with zero internet', b: lu ? 'Biwandiikibwa ku ssimu; bisinkana lwe mudda ku mutimbagano.' : 'Records live on the phone; they sync when you are back online.' },
                { icon: 'key', t: lu ? 'Ebisumuluzo bibiri buli kusasula' : 'Two keys on every payout', b: lu ? 'Tewali ssente zifuluma omukulu omu yekka.' : 'No money moves on one officer alone. Ever.' },
                { icon: 'groups', t: lu ? 'Mu Luganda, n’ebifaananyi' : 'Luganda first, faces not forms', b: lu ? 'Nyiga ekifaananyi ky’omukiise — teweetaaga kusoma linnya.' : 'Tap a member’s face — no need to read a name.' },
              ].map((r) => (
                <div key={r.t} className="flex gap-3 bg-white/70 rounded-xl p-3.5 border border-[#EAD9A0]">
                  <span className="w-10 h-10 rounded-lg bg-[#00261b] text-[#EAB308] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">{r.icon}</span>
                  </span>
                  <div>
                    <p className="font-bold text-sm text-[#00261b]">{r.t}</p>
                    <p className="text-xs text-[#4B5563] mt-0.5">{r.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="bg-[#00261b] text-white rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-3">
                <img src="/icon.svg" alt="" className="w-12 h-12 rounded-xl" />
                <div>
                  <p className="font-mono text-3xl font-bold">UGX 1,420,000</p>
                  <p className="text-[11px] text-[#bcedd7]">{lu ? 'Ssente mu sanduuko · abakwasi 3' : 'Box cash · verified by 3 keyholders'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                {[
                  [lu ? 'Ebyewolo' : 'Loans', '9.95M'],
                  [lu ? 'Obuyambi' : 'Welfare', '790K'],
                  [lu ? 'Abakiise' : 'Members', '30'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white/10 rounded-lg p-2.5 border border-white/10">
                    <p className="text-white/60 text-[10px]">{k}</p>
                    <p className="font-mono font-bold text-white">{v}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/60 mt-4 leading-relaxed">
                {lu
                  ? 'Ekibiina bwe kisalawo, ssente zisobola okubeera ku MoMo oba banka — nga buli kukyusa kuwandiikiddwa.'
                  : 'When the group chooses, money can sit on MoMo or a bank — every move recorded.'}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Paper vs app */}
      <section id="demos" className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <Reveal className="text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-[#00261b]">
            {lu ? 'Lwaki ebibiina biva ku kitabo' : 'Why groups leave the paper book'}
          </h2>
          <p className="text-[#4B5563] text-sm mt-2">{lu ? 'Ekitabo tekibula — kyongera amaanyi.' : 'The book doesn’t disappear — it gets backup.'}</p>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-4 mt-8 text-sm">
          <Reveal>
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 h-full">
              <p className="font-bold text-[#4B5563] uppercase text-xs tracking-wider mb-4">{lu ? 'Ekitabo ky’empapula' : 'Paper ledger'}</p>
              <ul className="space-y-3 text-[#4B5563]">
                {(lu
                  ? ['Ebitabo bibula, bikuluma oba bikuba enkuba', 'Omuntu omu y’asoma okuwandiika kw’omuwandiisi', 'Okubala kwa share-out kumala olunaku lwonna', 'Tewali bujulizi ssente bwezibula']
                  : ['Books get lost, torn or rained on', 'Only the secretary can read the handwriting', 'Share-out maths eats a whole Saturday', 'No proof when cash goes missing']
                ).map((li) => (
                  <li key={li} className="flex gap-2.5"><span className="text-red-400 font-bold">✕</span>{li}</li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-2xl border-2 border-[#006d30] p-6 bg-[#DCFCE7]/40 h-full">
              <p className="font-bold text-[#006d30] uppercase text-xs tracking-wider mb-4">VSLA UG</p>
              <ul className="space-y-3 font-medium text-[#00261b]">
                {(lu
                  ? ['Buli mukiise alaba akawunti ke ku ssimu ye', 'Tundanagane: ebintu n’omulembe mu kaduuka', 'Share-out emu n’okuggyamu amabanja', 'Buli shiringi erina akabonero k’omukulu']
                  : ['Each member sees their own account on their phone', 'Trade together: goods and services in the shop', 'One-tap share-out with loan deductions', 'Every shilling stamped by an officer']
                ).map((li) => (
                  <li key={li} className="flex gap-2.5"><span className="text-[#006d30] font-bold">✓</span>{li}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white border-y border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <Reveal className="text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-[#00261b]">{lu ? 'Emiwendo mu shiringi' : 'Pricing, in shillings'}</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <Reveal>
              <div className="rounded-2xl border-2 border-[#006d30] p-6 shadow-sm bg-[#DCFCE7]/20 h-full">
                <p className="font-bold text-[#006d30] uppercase text-xs tracking-wider">{lu ? 'Pilot — Mawa' : 'Pilot — Free'}</p>
                <p className="font-mono text-4xl font-bold mt-2">UGX 0</p>
                <p className="text-xs text-[#4B5563]">{lu ? 'bul i kibiina, mu pilot' : 'per group, all through pilot'}</p>
                <ul className="text-sm space-y-2 mt-4 text-[#4B5563]">
                  {(lu ? ['Abakiise 30', 'Akawunti za buli mukiise + akatuuka', 'Ppaasibuku, ebyewolo, obuyambi n’engassi', 'Etekeddwa awatali yintaneeti + backup'] : ['Up to 30 members', 'Member accounts + group market', 'Passbooks, loans, welfare & fines', 'Offline-first + backups']).map((li) => (
                    <li key={li}>✓ {li}</li>
                  ))}
                </ul>
                <a href="/app" className="block text-center mt-5 px-4 py-3 bg-[#006d30] text-white rounded-lg font-bold active:scale-[0.99] transition">{lu ? 'Tandika mawa' : 'Start free'}</a>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="rounded-2xl border border-[#E5E7EB] p-6 h-full">
                <p className="font-bold text-[#4B5563] uppercase text-xs tracking-wider">{lu ? 'Pro / SACCO — Egenda okujja' : 'Pro / SACCO — Soon'}</p>
                <p className="font-mono text-4xl font-bold mt-2">{lu ? 'Tukwate' : 'Talk to us'}</p>
                <p className="text-xs text-[#4B5563]">{lu ? 'emolo per group, sasula ne MoMo' : 'priced per group, MTN MoMo accepted'}</p>
                <ul className="text-sm space-y-2 mt-4 text-[#4B5563]">
                  {(lu ? ['Abakiise 500+', 'Database emu ku ssimu zonna', 'Okukunganya ne MoMo', 'Obuyambi ku WhatsApp amangu'] : ['Up to 500+ members', 'Shared cloud database across phones', 'Mobile-money collection', 'Priority WhatsApp support']).map((li) => (
                    <li key={li}>✓ {li}</li>
                  ))}
                </ul>
                <a href={waLink(lu ? 'Tusaba Pro y’ekibiina kyaffe.' : 'Hello VSLA UG! I want Pro for my savings group.')} target="_blank" rel="noreferrer" className="block text-center mt-5 px-4 py-3 border-2 border-[#00261b] text-[#00261b] rounded-lg font-bold active:scale-[0.99] transition">{lu ? 'Yingira ku lukalala' : 'Join the waitlist'}</a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Reveal className="text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-[#00261b]">{lu ? 'Ebibiina bitubuuza' : 'Groups ask us'}</h2>
        </Reveal>
        <div className="space-y-3 mt-8">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 open:border-[#006d30] open:shadow-sm transition">
              <summary className="font-bold text-sm cursor-pointer list-none flex justify-between items-center gap-2 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="material-symbols-outlined text-[#4B5563] group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              <p className="text-sm text-[#4B5563] mt-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#00261b] text-white">
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 text-center">
          <Reveal>
            <img src="/icon.svg" alt="" className="w-14 h-14 rounded-2xl mx-auto shadow-lg" />
            <h2 className="text-2xl md:text-4xl font-bold mt-4">
              {lu ? 'Yingiza ekibiina kyo Lwokutaano luno' : 'Bring your group on board this Friday'}
            </h2>
            <p className="text-white/70 mt-2">{lu ? 'Mawa mu pilot · Enteekateeka mu lukuŋŋaana lumu · Tugende!' : 'Free in pilot · Set up in one meeting · Tugende!'}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <a href="/app" className="px-8 py-3.5 bg-[#EAB308] text-[#00261b] rounded-lg font-bold hover:bg-yellow-400 active:scale-[0.99] transition">{lu ? 'Ggulawo App' : 'Open the App'}</a>
              <a href={waLink('Hello VSLA UG!')} target="_blank" rel="noreferrer" className="px-8 py-3.5 border-2 border-white/40 rounded-lg font-bold hover:border-white active:scale-[0.99] transition">WhatsApp</a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-bold text-[#00261b]">
            <img src="/icon.svg" alt="" className="w-7 h-7 rounded-md" /> VSLA UG
          </span>
          <div className="flex gap-5 text-xs font-semibold text-[#4B5563]">
            <a href="/app" className="hover:text-[#00261b]">{lu ? 'Ggulawo App' : 'Open App'}</a>
            <a href={waLink('Hello VSLA UG support!')} target="_blank" rel="noreferrer" className="hover:text-[#00261b]">{lu ? 'Buyambi' : 'Support'}</a>
          </div>
        </div>
        <p className="text-center text-[11px] text-[#4B5563] mt-4 font-mono">VSLA UG · Kampala, Uganda</p>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur border-t border-[#E5E7EB] p-3 flex gap-2">
        <a href="/app" className="flex-1 py-3 bg-[#006d30] text-white rounded-lg font-bold text-sm text-center active:scale-[0.99] transition">
          {lu ? 'Ggulawo App — Mawa' : 'Open App — Free'}
        </a>
        <a href={waLink('Hello VSLA UG!')} target="_blank" rel="noreferrer" className="px-4 py-3 border-2 border-[#00261b] text-[#00261b] rounded-lg font-bold text-sm active:scale-[0.99] transition">
          WhatsApp
        </a>
      </div>
    </div>
  );
};

/** Fade-and-rise on scroll. Pure IntersectionObserver + CSS — no library. */
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(16px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
      <style>{`@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }`}</style>
    </div>
  );
};

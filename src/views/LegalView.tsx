import React, { useState } from 'react';
import { Language, ScreenId } from '../types';

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
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;
  const displayGroupName = groupName === 'Savings Group' ? str('Savings Group', 'Ekibiina ky’ensimbi') : groupName;

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
           aria-label={str('Back', 'Ddayo emabega')}
         >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">{str('Legal & Constitution', 'Amateeka n’Ssemateeka')}</h1>
           <p className="text-xs text-text-muted">{displayGroupName}</p>
        </div>
      </div>

      <div className="flex bg-surface-card p-1 rounded-xl border border-border-strong">
        <button type="button" onClick={() => setTab('terms')} className={pill(tab === 'terms')}>
           {str('Terms', 'Amateeka')}
        </button>
        <button type="button" onClick={() => setTab('privacy')} className={pill(tab === 'privacy')}>
           {str('Privacy', 'Ebikwata ku kyama')}
        </button>
        <button
          type="button"
          onClick={() => setTab('constitution')}
          className={pill(tab === 'constitution')}
        >
           {str('Constitution', 'Ssemateeka')}
        </button>
      </div>

      <section className="bg-surface-card rounded-xl border border-border-line p-4 shadow-sm text-xs text-on-surface space-y-3 leading-relaxed">
        {tab === 'terms' && language === 'LU' && (
          <>
            <h2 className="font-bold text-sm text-primary">Amateeka n’obukwakkulizo</h2>
            <p>Soma era okkirize amateeka n’obukwakkulizo nga tonnakozesa VSLA UG.</p>
            <p>1. <strong>Okuba eggwanga ly’ekibiina.</strong> VSLA UG si bbanka. Okutwala ssente enkalu, okuyimiriza ebyewolo n’okuzimba amateeka mu kibiina bwe kisobola kuyimirizibwa n’abakuliriza abakozesebwa.</p>
            <p>2. <strong>Ebikwata ku bweera.</strong> Abawandiisi n’abawanika batandika ebikolo bulungi mu lukuŋŋaana. Okunyonnyola ebikolo mu lulimi lw’ekibiina kikola okwanga mu nsemateeka y’ekibiina.</p>
            <p>3. <strong>Ebikwatibwa.</strong> Ebikwata ku kibiina bisalibwa ku ssimu yo era, nga bisobola, bisindikwa ku kitabo kya kibiina kyo ekyekka. Kukuna kkopi y’ebitabo buli bw’ekwata n’okukebera bulungi.</p>
            <p>4. <strong>Kozesa bulungi.</strong> Akawunti emu buli mukiise. Toyagabana PIN za muwanika. Waako omuwanika n’olulunaku lw’ekibiina nga bwe ebizibu bino biikwata.</p>
            <p>5. <strong>Kuwuliriza.</strong> VSLA UG ekola nga t tekintaneeti; okusindikwa kugomba mutimbagano. Tweganda ku kukola kwa 99%, naye tetulina kuzingo ku msaa n’okukola bweru.</p>
            <p className="text-text-muted">Yaliyoolerwa mu September 2026 · Kampala, Uganda</p>
          </>
        )}
        {tab === 'terms' && language !== 'LU' && (
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
        {tab === 'privacy' && language === 'LU' && (
          <>
            <h2 className="font-bold text-sm text-primary">Enkola y’obukuumi bw’ebikwata ku bantu</h2>
            <p>1. <strong>Ebikwatibwa.</strong> Amatongo go mukiise, enamba za ssimu, ssente eziterekedwa, amabanja n’ebikwata ku lukuŋŋaana ebyo omulimu ow’owandiika yoleeta. Tewali kuki za kujja, tewali buhando bw’okuddessa.</p>
            <p>2. <strong>Ebali gyebisigala.</strong> Ku ssimu yo, nga t tekintaneeti, n’ekitabo kya kibiina kyo ekisindikwa, bali nkwatakana n’abawandiisi.</p>
            <p>3. <strong>Ani alabyo.</strong> Abakiise ba kibiina kyo yokka, ng’abaakiriziddwa mu balabaakaali babwe. Tewali tufuna kulunda ebikwata ku mukiise.</p>
            <p>4. <strong>Ekkizibu kyo.</strong> Omukiise onyimala asaba kkopi y’ekigwendererwa kyonna kya ppaasibuku ye (Ppaasibuku → Wandiika / Olupapula) n’asuza omwandiisi ayimirize ensobi.</p>
            <p>5. <strong>Obudde nokusigala.</strong> Ebikwata biggibwa okumala enziringana y’ekibiina n’omwaka gumala ogw’okukebera. Omuwandiisi ayirina okuzibikiza mu kitabo ebyago bye biri.</p>
            <p className="text-text-muted">Ebizibu: buuza omuwandiisi wa kibiina kandi omujjamaba wa kibiina.</p>
          </>
        )}
        {tab === 'privacy' && language !== 'LU' && (
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
        {tab === 'constitution' && language === 'LU' && (
          <>
            <h2 className="font-bold text-sm text-primary">Ssemateeka ya VSLA ey’ekigezo (yiikirizibwa ku bika by’ekibiina)</h2>
            <p><strong>Ibisobozeko 1 — Erinina n’ekigendererwa.</strong> Ekibiina kigyezamu ssente ez’oterekeza buli lwa kukya, kikwata ebyewolo ebiriko magaba g’apokukkiriza, era kikwanvuza abakiise mu buzibu okuwa n’essente z’obuyambi.</p>
            <p><strong>Ibisobozeko 2 — Abakiise n’obuvunaanyizibwa bwabwe.</strong> Kikomo ku abantu abakulu abali bulungi, abakkirizibwa ku lwokusinga ow’amagabi. Ppaasibuku emu buli mukiise. Olukiiko lw’okugenda ku mpaliro buli lwa kukya, nga omukiise atakikkirizibwa.</p>
            <p><strong>Ibisobozeko 3 — Emigabo.</strong> Omuwendo gw’omugabo tegamuka mu enziringana. Abakiise bagula emigabo 1–5 buli lwa kukya. Ekyewolo ekisinga kya 3× ssente ez’omukiise eziterekedwa kisoboka.</p>
            <p><strong>Ibisobozeko 4 — Amabanja.</strong> Muggo wa 5% buli mwezi ku bbanja ly’omukiise, era asubirwa ku bbanja ey’obuuka. Abakakikiza abiri basaba. Omusajja ayitwala erinnya. Ebisigala eby’okusinga bw’abakakikiza biggibwa ku nkomerero, nga bwe gumba ssente zabwe zikyaludda.</p>
            <p><strong>Ibisobozeko 5 — Obuyambi.</strong> Ssente ez’erali buli mwezi. Obuyambi buteyozekedwa kuzibu era kukkirizibwa n’abawandiisi mu kifo ky’obulamu, obuddayo no buzibu omwanga.</p>
            <p><strong>Ibisobozeko 6 — Isanduuko.</strong> Abakwasi aba abalaw okukubwa. Obuzi bwa mubale bukakikizibwa. Ku buli kaseera k’okubikula, endikita ebibiri zisaba. Tetekikubwa isanduuko nga taluki mu lukuŋŋaana.</p>
            <p><strong>Ibisobozeko 7 — Engassi.</strong> Kujja mu bwire, kwerayo nga tonnabujja, ensobi y’olusimu — engassi ezikozesebwa n’ekibiina, ezikunganyizibwa mu sanduuko.</p>
            <p><strong>Ibisobozeko 8 — Kugaba emigabo.</strong> Ekkya y’enziringana, essente zonna n’amagaba zigabanyizibwa mu nkulinganiro ng’emigabo. Amabanja gabatandikwa ku nkomerero.</p>
            <p className="text-text-muted">Yakkirizibwa ku kisomo ky’ekibiina · Amasigni gakufo: Omujjamaba, Omuwandiisi, Omuwanika.</p>
          </>
        )}
        {tab === 'constitution' && language !== 'LU' && (
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

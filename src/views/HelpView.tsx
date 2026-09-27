import React, { useState } from 'react';
import { FraudCategory, FRAUD_CATEGORIES, buildFraudReportMessage, waHref } from '../utils/smsReminders';
import { SpeakButton } from '../components/SpeakButton';
import { Language, ScreenId } from '../types';

interface HelpViewProps {
  onNavigate: (screen: ScreenId) => void;
  language?: Language;
  isPractice?: boolean;
  onEnterPractice?: () => void;
  onExitPractice?: () => void;
  groupName?: string;
  boxIdentifier?: string;
  reporterName?: string;
}

const SUPPORT_WHATSAPP = '256772445566';

/**
 * Upgrade #18 — in-app Help & Support center.
 */
export const HelpView: React.FC<HelpViewProps> = ({
  onNavigate,
  language = 'EN',
  isPractice = false,
  onEnterPractice,
  onExitPractice,
  groupName = 'Savings Group',
  boxIdentifier = '',
  reporterName = '',
}) => {
  const [open, setOpen] = useState<number | null>(0);
  const [fraudCat, setFraudCat] = useState<FraudCategory>('missing');
  const [fraudDetails, setFraudDetails] = useState('');
  const [fraudNamed, setFraudNamed] = useState(false);
  const [fraudSent, setFraudSent] = useState(false);
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;
  const displayGroupName = !groupName || groupName === 'Savings Group' ? str('Savings Group', 'Ekibiina ky’ensimbi') : groupName;
  const lang = language === 'LU' ? 'LU' : 'EN';

  const fraudCategoryLabels: Record<FraudCategory, string> = {
    missing: str('Missing money', 'Ssente zibula'),
    balance: str('Wrong balance', 'Oluwadde lwa ssente liwukene'),
    leader: str('Leader problem', 'Ensobi ku mukulu'),
    app: str('App not working', 'Poroguramu tekoze bulungi'),
    other: str('Something else', 'Ekirala'),
  };
  const supportMessage = str(
    'Hello VSLA UG support, I need help with my savings group.',
    'Mukwege ku buyambi bwa VSLA UG, ndiina nkwagala n’ekibiina kange ky’ensimbi.'
  );
  const fraudMessage = language === 'LU'
    ? `VSLA UG — OKULOOPA (kyama)\nEkibiina: ${displayGroupName} (${boxIdentifier})\nEnsonga: ${fraudCategoryLabels[fraudCat]}\nOmutumya: ${fraudNamed && reporterName ? reporterName : 'Omukiise (erinnya likwekeddwa)'}\nEbisingawo: ${fraudDetails.trim().slice(0, 500) || '—'}`
    : buildFraudReportMessage({
        groupName,
        boxIdentifier,
        category: fraudCat,
        details: fraudDetails,
        reporterName: fraudNamed ? reporterName : '',
        lang,
      });
  const fraudLink = waHref(SUPPORT_WHATSAPP, fraudMessage);

  const faqs = [
    {
      q: str('The screen went white / the app froze. What do I do?', 'Ssimu eraze olwelu? Nga poroguramu yatanga ntya?'),
      a: str('Close the app and reopen it. If it repeats, download the emergency backup first, then use Backup & Audit → Restore. Never reset real group data.', 'Ggalawo poroguramu n’ogiggulawo. Singa kikigera, kooka kkopi y’ebitabo y’obuzibu ku nkomerero, kiseera n’obuyiikiriza okuddayo, oluze okujja eka ekikwata ku nkangyinganya. Bw’olwo, kikole ku mabali g’akasa; kikole n’ekikolo bya simu. Tetoniiki musaale y’ekibiina.'),
    },
    {
      q: str('How do I add a new member?', 'Nyungiza ntya omukiise omupya?'),
      a: str('Share your group invite code (Home → Invite). The member opens the app, taps the group menu → Join with Invite Code, and enters their name and phone.', 'Gabana koodi y’ekibiina (Awaka → Yita). Omukiise aggulawo poroguramu, ahikira ku menyu y’ekibiina → Yingira ku Koodi y’Ekibiina, n’awandiika erinina lye ne namba ya ssimu ye.'),
    },
    {
      q: str('Cash counted does not match the expected total?', 'Ssente ezibaliddwa tezinga n’eziteekedwa?'),
      a: str('Recount with two keyholders watching. If a gap remains, record the reason in Meeting Close and recount before sealing. The box stays locked until the count matches.', 'Mubale bulungi n’abakwasi abari nga babaweeralo. Bwe enjawulo egisigala, wandiika ensonga mu Okuggala Olukuŋŋaana oluweka mu Kufumba Olukuŋŋaana, oluze omubale bulungi nga tonnasiba. Isanduuko siggibwa kuyiikidwa nga ennimiro y’ezo ezibaliddwa tetennasirika.'),
    },
    {
      q: str('How do I print a receipt or report?', 'Chapisha ntya risiti oba lipoota?'),
      a: str('Every repayment and share purchase shows a receipt with a Print button. Reports → Print Report prints the full group report. Any phone with a Bluetooth printer works.', 'Buli kusasula n’okugula emigabo kulaga risiti ebikwata ku buto ya Chapisha. Lipoota → Chapisha lipoota: ekyo chapisha lipoota y’ekibiina yonna. Ssimu ono ekwata ku mashini ya Bluetooth esobola.'),
    },
    {
      q: str('Is my data safe without internet?', 'Ebikwata bwange bibumba bulungi nga t tekintaneeti?'),
      a: str('Yes — the app is offline-first. Records live on the phone and sync when you are back online. Download a backup (JSON) after every meeting.', 'Yee, poroguramu ekola nga t tekintaneeti. Ebikwata bisigala ku ssimu era bisindikwa ng’omubadde wemuka omu mutimbagano. Koppa kkopi y’ebitabo mu nsozi wa JSON buli lukuŋŋaana.'),
    },
  ];

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
          <h1 className="font-bold text-primary">{str('Help & Support', 'Buyambi n’Nnungi')}</h1>
          <p className="text-xs text-text-muted">{str('Answers in English & Luganda', 'Ebyokuddamu mu Oluganda n’Oluzungu')}</p>
        </div>
      </div>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(supportMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 bg-[#006d30] text-white rounded-xl p-4 shadow-sm active:scale-[0.99]"
      >
        <span className="material-symbols-outlined text-[28px]">support_agent</span>
        <span>
           <span className="block font-bold text-sm">{str('Chat with support on WhatsApp', 'Yogera n’buyambi ku WhatsApp')}</span>
           <span className="block text-xs opacity-80">+256 772 445566 · {str('Mon–Sat, 8am–6pm', 'Muw–Muk, 8:00–18:00')}</span>
        </span>
      </a>

      {/* Practice mode: safe play-money group for first-time smartphone users */}
      <section className="bg-[#FFF8E1] border-2 border-[#EAB308] rounded-xl p-4 space-y-2">
        <h2 className="font-bold text-sm text-[#00261b] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[20px]">sports_esports</span>
           {str('Try first with play money', 'Zooka ogezeeko n:ssente za kuzannya')}
        </h2>
        <p className="text-xs text-[#4B5563] leading-relaxed">
          {str(
            'New to apps? Open a fake 5-member group. Record shares, repay a loan, seal a meeting — nothing real moves. Your real group is saved and restored.',
             'Omanyi poroguramu? Ggulawo ekibiina eky’ekigezo ekirimu abakiise 5. Weeyigire okutereka emigabo n’okuzimba olukuŋŋaana — tewali ssente ddala ezikwatibwako. Ekibiina kyo ekiddu kikuumibwa bulungi.'
          )}
        </p>
        {isPractice ? (
          <button
            type="button"
            onClick={onExitPractice}
            className="w-full min-h-[52px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
          >
             {str('Exit practice → back to my real group', 'Fuluma mu kuzannya → ddayo ekibiina kyange ekiddu')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnterPractice}
            className="w-full min-h-[52px] bg-[#EAB308] text-[#00261b] rounded-lg font-bold text-sm active:scale-[0.99]"
          >
             {str('Open practice group (free, safe)', 'Ggulawo ekibiina eky’ekigezo (bweru, kirungi)')}
          </button>
        )}
      </section>

      {/* Confidential fraud report — leaves no trace on this phone */}
      <section className="bg-status-bad-bg/40 border-2 border-status-bad-tx/40 rounded-xl p-4 space-y-2.5">
        <h2 className="font-bold text-sm text-status-bad-tx flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[20px]">report</span>
          {str('Report a problem — privately', 'Loopa ensonga — mu kyama')}
        </h2>
        <p className="text-xs text-text-muted leading-relaxed">
          {str(
            'Money missing? Wrong balance? Goes straight to VSLA UG support on WhatsApp. Nothing is saved on this phone.',
            'Ssente zibula? Oluwadde lwa ssente liwukene? Kuloopa kutwala buweru ku buyambi bwa VSLA UG ku WhatsApp. Tewali kikuumibwa ku ssimu eno.'
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FRAUD_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFraudCat(c.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                fraudCat === c.id ? 'bg-status-bad-tx text-white shadow' : 'bg-white border border-border-strong text-on-surface'
              }`}
            >
               {fraudCategoryLabels[c.id]}
            </button>
          ))}
        </div>
        <textarea
          value={fraudDetails}
          onChange={(e) => setFraudDetails(e.target.value)}
           rows={2}
           maxLength={500}
           placeholder={str('What happened? (optional, max 500)', 'Kiki ekyabadde? (nsobola, 500)')}
           aria-label={str('What happened?', 'Kiki ekyabadde?')}
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-xs bg-white"
        />
        <button
          type="button"
          onClick={() => setFraudNamed(!fraudNamed)}
          className={`w-full min-h-[44px] rounded-lg text-xs font-bold border transition ${
            fraudNamed ? 'bg-primary-container text-white border-primary-container' : 'bg-white border-border-strong text-text-muted'
          }`}
        >
          {fraudNamed
             ? str(`✓ Sending as ${reporterName || 'member'}`, `✓ Otuma nga ${reporterName || 'omukiise'}`)
            : str('Stay anonymous (recommended)', 'Sigala mu kyama (kirungi)')}
        </button>
        <a
          href={fraudLink}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            setFraudSent(true);
            setFraudDetails('');
            setTimeout(() => setFraudSent(false), 4000);
          }}
          className="block text-center w-full py-3 bg-status-bad-tx text-white rounded-lg font-bold text-sm active:scale-[0.99]"
        >
           {fraudSent ? str('✓ Opened WhatsApp — send it there', '✓ WhatsApp eggudde — weereza kwo') : str('Send report on WhatsApp', 'Weereza kuloopa ku WhatsApp')}
        </a>
      </section>

      <section className="space-y-2">
        {faqs.map((f, i) => (
          <div key={i} className="bg-surface-card border border-border-line rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-2 p-3.5 text-left"
            >
              <span className="text-xs font-bold text-primary">{f.q}</span>
              <span className="material-symbols-outlined text-text-muted text-[18px] shrink-0">
                {open === i ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {open === i && (
              <div className="px-3.5 pb-3.5 space-y-2.5">
                <p className="text-xs text-text-muted leading-relaxed">{f.a}</p>
                <SpeakButton text={f.a} label="Read aloud" />
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
};

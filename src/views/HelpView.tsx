import React, { useState } from 'react';
import { Language, ScreenId } from '../types';

interface HelpViewProps {
  onNavigate: (screen: ScreenId) => void;
  language?: Language;
}

const SUPPORT_WHATSAPP = '256772445566';

/**
 * Upgrade #18 — in-app Help & Support center.
 */
export const HelpView: React.FC<HelpViewProps> = ({ onNavigate, language = 'EN' }) => {
  const [open, setOpen] = useState<number | null>(0);
  const str = (en: string, lu: string, sw: string) =>
    language === 'LU' ? lu : language === 'SW' ? sw : en;

  const faqs = [
    {
      q: str('The screen went white / the app froze. What do I do?', 'Ssimu eraze olwelu? Nkole ntya?', 'Skrini imekuwa nyeupe. Nifanye nini?'),
      a: str('Close the tab and reopen. Your records are saved on the phone. If it repeats, use Backup & Audit → Reset, then restore your last downloaded backup.', 'Ggalawo ttabu oddamu n\'ogiggulawo. Ebiwandiiko biri ku ssimu. Singa kiddamu, kozesa Backup → Reset.', 'Funga kichupo ufungue tena. Kumbukumbu ziko kwenye simu. Iikirudia, tumia Backup → Reset.'),
    },
    {
      q: str('How do I add a new member?', 'Nyungiza ntya omukiise omupya?', 'Nimwongezeaje mwanachama mpya?'),
      a: str('Share your group invite code (Home → Invite). The member opens the app, taps the group menu → Join with Invite Code, and enters their name and phone.', 'Gabana koodi y\'ekibiina (Awaka → Yita). Omukiise aggulawo app → Yingirira ku Koodi.', 'Shiriki kodi ya kikundi (Mwanzo → Alika). Mwanachama afungue app → Jiunge kwa Kodi.'),
    },
    {
      q: str('Cash counted does not match the expected total?', 'Ssente ze mubaze teziringa?', 'Fedha zilizohesabiwa hazilingani?'),
      a: str('Recount with two keyholders watching. If a gap remains, file a discrepancy form in Meeting Close — it adjusts via the welfare pot or a top-up, and logs everything to Audit.', 'Ddamu okubala n\'abakwasi babiri. Bwe wabawo enjawulo, jjuza fomu mu Meeting Close.', 'Hesabu tena na washika funguo wawili. Ikiwa pengo lipo, jaza fomu kwenye Meeting Close.'),
    },
    {
      q: str('How do I print a receipt or report?', 'Nkuba ntya risiti oba lipoota?', 'Nitachapishaje risiti au ripoti?'),
      a: str('Every repayment and share purchase shows a receipt with a Print button. Reports → Print Report prints the full group report. Any phone with a Bluetooth printer works.', 'Buli kusasula kulaga risiti ne button ya Print. Lipoota → Chapisha.', 'Kila malipo unaonyesha risiti na kitufe cha Print. Ripoti → Chapisha.'),
    },
    {
      q: str('Is my data safe without internet?', 'Data yange eri mu bulambulukufu awatali yintaneeti?', 'Data yangu iko salama bila mtandao?'),
      a: str('Yes — the app is offline-first. Records live on the phone and sync when you are back online. Download a backup (JSON) after every meeting.', 'Yee — app ekola awatali yintaneeti. Koppa backup buli lukuŋŋaana.', 'Ndiyo — app inafanya kazi bila mtandao. Pakua nakala (JSON) baada ya kila mkutano.'),
    },
  ];

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary active:scale-95 transition"
          type="button"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">{str('Help & Support', 'Buyambi', 'Msaada')}</h1>
          <p className="text-xs text-text-muted">{str('Answers in English, Luganda & Swahili', 'Ebyokuddamu mu nnimi ssatu', 'Majibu kwa lugha tatu')}</p>
        </div>
      </div>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hello Bakwata VSLA support, I need help with my savings group.')}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 bg-[#006d30] text-white rounded-xl p-4 shadow-sm active:scale-[0.99]"
      >
        <span className="material-symbols-outlined text-[28px]">support_agent</span>
        <span>
          <span className="block font-bold text-sm">{str('Chat with support on WhatsApp', 'Yogera naffe ku WhatsApp', 'Ongea nasi WhatsApp')}</span>
          <span className="block text-xs opacity-80">+256 772 445566 · {str('Mon–Sat, 8am–6pm', 'Muw–Muk, 8–18', 'Jumatatu–Jumamosi')}</span>
        </span>
      </a>

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
            {open === i && <p className="px-3.5 pb-3.5 text-xs text-text-muted leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </section>
    </main>
  );
};

import React, { useRef, useState } from 'react';
import { Language, SaccoDetails, ScreenId, ShareClass } from '../types';
import { fileToAvatarDataUrl } from '../utils/photo';
import { GroupLogo } from '../components/GroupLogo';
import { memberCapForPlan } from '../utils/policy';
import { InfoTip } from '../components/InfoTip';
import { RECOMMENDED_SURPLUS_POLICY, buildSurplusPlan, normalizePolicy } from '../utils/surplus';

export interface GroupSettingsPatch {
  groupName: string;
  boxIdentifier: string;
  location: string;
  meetingDay: string;
  sharePrice: number;
  welfareMonthly: number;
  totalCycleMonths: number;
  maxSharesPerMeeting: number;
  requiredGuarantors: number;
  borrowMultiplier: number;
  loanMinimum: number;
  loanRates: {
    oneMonth: number;
    twoMonths: number;
    threeMonths: number;
  };
  welfareCategoryCaps: {
    medical: number;
    bereavement: number;
    other: number;
  };
  shareClasses: ShareClass[];
  /** Only used by registered SACCOs; blank for plain village groups. */
  sacco: SaccoDetails;
  logoUrl?: string;
}

interface GroupSettingsViewProps {
  groupName: string;
  boxIdentifier: string;
  location: string;
  meetingDay: string;
  sharePrice: number;
  welfareMonthly: number;
  totalCycleMonths: number;
  maxSharesPerMeeting: number;
  requiredGuarantors: number;
  borrowMultiplier: number;
  loanMinimum: number;
  loanRates: {
    oneMonth: number;
    twoMonths: number;
    threeMonths: number;
  };
  welfareCategoryCaps: {
    medical: number;
    bereavement: number;
    other: number;
  };
  shareClasses: ShareClass[];
  /** SACCO registration fields; empty for plain village groups. */
  sacco?: SaccoDetails;
  inviteCode: string;
  membersCount: number;
  logoUrl?: string;
  plan?: string;
  language?: Language;
  onSave: (patch: GroupSettingsPatch) => void;
  onNavigate: (screen: ScreenId) => void;
}

/** Group settings screen: editable constitution-adjacent constants + share/welfare amounts. */
export const GroupSettingsView: React.FC<GroupSettingsViewProps> = ({
  groupName,
  boxIdentifier,
  location,
  meetingDay,
  sharePrice,
  welfareMonthly,
  totalCycleMonths,
  maxSharesPerMeeting,
  requiredGuarantors,
  borrowMultiplier,
  loanMinimum,
  loanRates,
  welfareCategoryCaps,
  shareClasses,
  sacco = {},
  inviteCode,
  membersCount,
  logoUrl,
  plan = 'free',
  language = 'EN',
  onSave,
  onNavigate,
}) => {
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;
  const [form, setForm] = useState<GroupSettingsPatch>({
    groupName: language === 'LU' && (!groupName || groupName === 'Savings Group') ? 'Ekibiina ky’ensimbi' : groupName,
    boxIdentifier: language === 'LU' && boxIdentifier === 'BOX' ? 'SANDUUKO' : boxIdentifier,
    location,
    meetingDay: language === 'LU' && meetingDay === 'Every Friday 4:00 PM' ? 'Buli Lwokutaano 16:00' : meetingDay,
    sharePrice,
    welfareMonthly,
    totalCycleMonths,
    maxSharesPerMeeting,
    requiredGuarantors,
    borrowMultiplier,
    loanMinimum,
    loanRates,
    welfareCategoryCaps,
    shareClasses: shareClasses.length > 0
      ? shareClasses.map((shareClass) => language === 'LU' && shareClass.id === 'standard' && shareClass.name === 'Standard share'
          ? { ...shareClass, name: 'Omugabo w’obuzaraway' }
          : shareClass)
      : [{ id: 'standard', name: str('Standard share', 'Omugabo w’obuzaraway'), price: sharePrice, active: true }],
    sacco: { ...sacco },
    logoUrl: logoUrl || '',
  });
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof GroupSettingsPatch, v: string | number) => {
    setForm({ ...form, [k]: v });
    setSaved(false);
  };

  const setShareClass = (id: string, patch: Partial<ShareClass>) => {
    setForm((current) => ({
      ...current,
      shareClasses: current.shareClasses.map((shareClass) => shareClass.id === id ? { ...shareClass, ...patch } : shareClass),
    }));
    setSaved(false);
  };

  const addShareClass = () => {
    setForm((current) => ({
      ...current,
      shareClasses: [
        ...current.shareClasses,
        { id: `share-${Date.now().toString(36)}`, name: str(`Share ${current.shareClasses.length + 1}`, `Omugabo ${current.shareClasses.length + 1}`), price: current.sharePrice, active: true },
      ],
    }));
    setSaved(false);
  };

  const setSacco = (patch: Partial<SaccoDetails>) => {
    setForm((current) => ({ ...current, sacco: { ...current.sacco, ...patch } }));
    setSaved(false);
  };

  const setLoanRate = (key: keyof GroupSettingsPatch['loanRates'], value: number) => {
    setForm((current) => ({ ...current, loanRates: { ...current.loanRates, [key]: value } }));
    setSaved(false);
  };

  const setWelfareCap = (key: keyof GroupSettingsPatch['welfareCategoryCaps'], value: number) => {
    setForm((current) => ({ ...current, welfareCategoryCaps: { ...current.welfareCategoryCaps, [key]: value } }));
    setSaved(false);
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    setLogoError(null);
    try {
      const url = await fileToAvatarDataUrl(file);
      setForm({ ...form, logoUrl: url });
      setSaved(false);
    } catch (e: any) {
      setLogoError(language === 'LU' ? 'Alogo teyateekedde.' : e.message || 'Logo failed.');
    } finally {
      setLogoBusy(false);
    }
  };
  const inputCls = 'w-full min-h-[44px] border border-border-strong rounded-lg px-3 text-sm bg-white text-primary';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.groupName.trim()) return;
    onSave({
      ...form,
      groupName: form.groupName.trim(),
      boxIdentifier: form.boxIdentifier.trim() || (language === 'LU' && boxIdentifier === 'BOX' ? 'SANDUUKO' : boxIdentifier),
      location: form.location.trim(),
      meetingDay: form.meetingDay.trim(),
       sharePrice: Math.max(1000, Math.floor(Number(form.sharePrice) || 0)),
       welfareMonthly: Math.max(0, Math.floor(Number(form.welfareMonthly) || 0)),
       totalCycleMonths: Math.min(24, Math.max(1, Math.floor(Number(form.totalCycleMonths) || 10))),
       maxSharesPerMeeting: Math.min(50, Math.max(1, Math.floor(Number(form.maxSharesPerMeeting) || 5))),
       requiredGuarantors: Math.min(10, Math.max(0, Math.floor(Number(form.requiredGuarantors) || 0))),
       borrowMultiplier: Math.min(10, Math.max(1, Number(form.borrowMultiplier) || 3)),
       loanMinimum: Math.max(0, Math.floor(Number(form.loanMinimum) || 0)),
       loanRates: {
         oneMonth: Math.max(0, Number(form.loanRates.oneMonth) || 0),
         twoMonths: Math.max(0, Number(form.loanRates.twoMonths) || 0),
         threeMonths: Math.max(0, Number(form.loanRates.threeMonths) || 0),
       },
       welfareCategoryCaps: {
         medical: Math.max(0, Math.floor(Number(form.welfareCategoryCaps.medical) || 0)),
         bereavement: Math.max(0, Math.floor(Number(form.welfareCategoryCaps.bereavement) || 0)),
         other: Math.max(0, Math.floor(Number(form.welfareCategoryCaps.other) || 0)),
       },
       shareClasses: form.shareClasses
         .filter((shareClass) => shareClass.name.trim() && shareClass.price > 0)
         .map((shareClass) => ({ ...shareClass, name: shareClass.name.trim(), price: Math.max(1, Math.floor(shareClass.price)) })),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-12 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-lg bg-surface-card border border-border-strong flex items-center justify-center text-primary"
          type="button"
          aria-label={str('Back', 'Ddayo emabega')}
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div>
          <h1 className="font-bold text-primary">{str('Group Settings', 'Ennanga y’ekibiina')}</h1>
          <p className="text-xs text-text-muted">
            {membersCount} {str('members', 'abakiise')} · {str('Invite', 'Koodi y’okuyita')} <span className="font-mono font-bold text-secondary">{inviteCode}</span>
          </p>
        </div>
      </div>

      {saved && (
        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          {str('Settings saved to this group’s ledger.', 'Ennanga ziri ku kitabo ky’ekibiina kino.')}
        </p>
      )}

      {/* Plan & upgrade — set by admin after MoMo payment, never by the group */}
      <section className="bg-surface-card border border-border-line rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            {str('Plan', 'Ennanga y’ekibiina')}
          </h3>
          <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${plan === 'free' ? 'bg-surface-container text-text-muted border border-border-strong' : 'bg-[#EAB308] text-[#00261b]'}`}>
            {plan === 'free' ? str('FREE', 'BWERU') : plan.toUpperCase()} · {membersCount}/{memberCapForPlan(plan)}
          </span>
        </div>
        {plan === 'free' ? (
          <a
            href={`https://wa.me/256772445566?text=${encodeURIComponent(str(`Hello VSLA UG! I want Pro for ${groupName} (${membersCount} members).`, `Mukwege VSLA UG! Nwantula Pro ku kibiina kya ${form.groupName} (${membersCount} abakiise).`))}`}
            target="_blank"
            rel="noreferrer"
            className="block text-center w-full min-h-[48px] leading-[48px] bg-[#006d30] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
          >
            {str('Upgrade to Pro — WhatsApp', 'Yongera ku Pro — WhatsApp')}
          </a>
        ) : (
          <p className="text-[11px] text-text-muted">
            {str('Your plan is active. Thank you!', 'Ennanga yo ekikola. Webale!')}
          </p>
        )}
      </section>

      <form onSubmit={submit} className="bg-surface-card border border-border-line rounded-xl p-4 space-y-3">
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Group logo', 'Alogo y’ekibiina')}</label>
          <div className="flex items-center gap-3">
            <GroupLogo logoUrl={form.logoUrl || undefined} alt={form.groupName} className="w-14 h-14 rounded-xl border border-border-strong" />
            <div className="flex-1 space-y-1.5">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={logoBusy}
                className="px-3 py-2 bg-surface-container border border-border-strong text-primary rounded-lg text-xs font-bold active:scale-95 disabled:opacity-50"
              >
                {logoBusy ? '…' : form.logoUrl ? str('Change logo', 'Kyuuta alogo') : str('Upload logo', 'Teeka alogo')}
              </button>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logoUrl: '' })}
                  className="block text-[11px] font-bold text-text-muted underline"
                >
                  {str('Use VSLA logo instead', 'Kozesa alogo ya VSLA')}
                </button>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickLogo(e.target.files?.[0])}
              aria-label={str('Upload group logo', 'Teeka alogo y’ekibiina')}
            />
          </div>
          {logoError && <p className="text-[11px] font-bold text-status-bad-tx">{logoError}</p>}
          <p className="text-[11px] text-text-muted mt-1">{str('Your logo replaces the VSLA mark everywhere in this app — top bar, sign-in, receipts.', 'Alogo yo kajja kulamba alogo ya VSLA buli kifo mu poroguramu kino — ku n’olugala, k’ekyirizibwa n’ebisindika.')}</p>
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Group name', 'Erinina ly’ekibiina')}</label>
          <input value={form.groupName} onChange={(e) => set('groupName', e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Box ID', 'Koodi y’ekisanduuko')}</label>
            <input value={form.boxIdentifier} onChange={(e) => set('boxIdentifier', e.target.value)} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Cycle (months)', 'Enziringana (emwezi)')}</label>
            <input type="number" min={1} max={24} value={form.totalCycleMonths} onChange={(e) => set('totalCycleMonths', Number(e.target.value))} className={`${inputCls} font-mono`} />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Location', 'Ekitondeero')}</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Meeting day', 'Olunaku lwa lukuŋŋaana')}</label>
          <input value={form.meetingDay} onChange={(e) => set('meetingDay', e.target.value)} placeholder={str('Every Friday 4:00 PM', 'Buli Lwokutaano 16:00')} className={inputCls} />
        </div>
         <div className="grid grid-cols-2 gap-2">
           <div>
             <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Share price (UGX)', 'Omuwendo gw’omugabo (UGX)')}</label>
             <input type="number" min={1000} step={500} value={form.sharePrice} onChange={(e) => set('sharePrice', Number(e.target.value))} className={`${inputCls} font-mono`} />
           </div>
           <div>
             <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Welfare / month (UGX)', 'Obuyambi / mwezi (UGX)')}</label>
             <input type="number" min={0} step={500} value={form.welfareMonthly} onChange={(e) => set('welfareMonthly', Number(e.target.value))} className={`${inputCls} font-mono`} />
           </div>
         </div>
         <div className="border-t border-border-line pt-3 space-y-2">
           <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">{str('Welfare limits', 'Ensaze z’obuyambi')} <InfoTip label={str('About welfare limits', 'Kikwata ensaze z’obuyambi')} language={language}>{str('These caps guide emergency requests. Larger requests go to the approvals queue.', 'Ensaze zi ziragana n’ebisuuza by’obuzibu. Ebisuuza ebisinga n’obukulu biggibwa mu lupalula lwa kukkiriza.')}</InfoTip></h3>
           <div className="grid grid-cols-3 gap-2">
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Medical cap', 'Ensaze y’obulamu')}</label>
               <input type="number" min={0} step={1000} value={form.welfareCategoryCaps.medical} onChange={(e) => setWelfareCap('medical', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Bereavement cap', 'Ensaze y’obuddayo')}</label>
               <input type="number" min={0} step={1000} value={form.welfareCategoryCaps.bereavement} onChange={(e) => setWelfareCap('bereavement', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Other cap', 'Ensaze endala')}</label>
               <input type="number" min={0} step={1000} value={form.welfareCategoryCaps.other} onChange={(e) => setWelfareCap('other', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
           </div>
         </div>
         <div className="border-t border-border-line pt-3 space-y-2">
           <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">{str('Group rules', 'Amateeka g’ekibiina')} <InfoTip label={str('About group rules', 'Kikwata amateeka g’ekibiina')} language={language}>{str('These rules control how many shares, confirmers, borrowing and loan fees the group uses.', 'Amateeka gano gata ku nyingi y’emigabo, abakakikiza, okuwewola n’amagoba g’ebyewolo agatambula mu kibiina.')}</InfoTip></h3>
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Max shares / meeting', 'Emigabo ekikomo / lukuŋŋaana')}</label>
               <input type="number" min={1} max={50} value={form.maxSharesPerMeeting} onChange={(e) => set('maxSharesPerMeeting', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Confirmers required', 'Ennamba y’abakakikiza esabatwa')}</label>
               <input type="number" min={0} max={10} value={form.requiredGuarantors} onChange={(e) => set('requiredGuarantors', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
           </div>
           <div className="grid grid-cols-2 gap-2">
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Borrowing multiple', 'Okusinga okuzannyisa ekyewolo')}</label>
               <input type="number" min={1} max={10} step={0.5} value={form.borrowMultiplier} onChange={(e) => set('borrowMultiplier', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Minimum loan (UGX)', 'Ekyewolo ekikomo (UGX)')}</label>
               <input type="number" min={0} step={1000} value={form.loanMinimum} onChange={(e) => set('loanMinimum', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
           </div>
           <div className="grid grid-cols-3 gap-2">
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('1 month %', 'Mwezi 1 — %')}</label>
               <input type="number" min={0} max={100} value={form.loanRates.oneMonth} onChange={(e) => setLoanRate('oneMonth', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('2 months %', 'Mwezi 2 — %')}</label>
               <input type="number" min={0} max={100} value={form.loanRates.twoMonths} onChange={(e) => setLoanRate('twoMonths', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('3 months %', 'Mwezi 3 — %')}</label>
               <input type="number" min={0} max={100} value={form.loanRates.threeMonths} onChange={(e) => setLoanRate('threeMonths', Number(e.target.value))} className={`${inputCls} font-mono`} />
             </div>
           </div>
         </div>
         <div className="border-t border-border-line pt-3 space-y-2">
           <div className="flex items-center justify-between">
             <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">{str('Share prices', 'Amuwendo g’emigabo')} <InfoTip label={str('About share prices', 'Kikwata amuwendo g’emigabo')} language={language}>{str('Add more than one price when the group has different share classes.', 'Yoongeza amuwendo gumala nga ekibiina kirina emigabo eb’enjawulo.')}</InfoTip></h3>
             <button type="button" onClick={addShareClass} className="min-h-[40px] px-3 rounded-lg bg-surface-container border border-border-line text-primary text-xs font-bold">{str('+ Add price', '+ Yoongezera omuwendo')}</button>
           </div>
           <div className="space-y-2">
             {form.shareClasses.map((shareClass, index) => (
               <div key={shareClass.id} className="space-y-1.5 rounded-lg border border-border-line p-2 bg-canvas-bg">
                 <div className="grid grid-cols-[1fr_110px_44px] gap-2 items-center">
                   <input value={shareClass.name} onChange={(e) => setShareClass(shareClass.id, { name: e.target.value })} className={inputCls} aria-label={str(`Share class ${index + 1} name`, `Erinina ly’omugabo ${index + 1}`)} />
                   <input type="number" min={1} step={500} value={shareClass.price} onChange={(e) => setShareClass(shareClass.id, { price: Number(e.target.value) })} className={`${inputCls} font-mono`} aria-label={str(`Share class ${index + 1} price`, `Amuwendo gw’omugabo ${index + 1}`)} />
                   <button type="button" onClick={() => setShareClass(shareClass.id, { active: !shareClass.active })} className={`min-h-[44px] rounded-lg border text-xs font-bold ${shareClass.active ? 'bg-primary text-white' : 'bg-white text-text-muted'}`} aria-label={shareClass.active ? str('Disable share price', 'Hiiika omuwendo gw’omugabo') : str('Enable share price', 'Yolokeza omuwendo gw’omugabo')}>{shareClass.active ? str('On', 'Kiko') : str('Off', 'Naffe')}</button>
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                   <label className="flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
                     <input type="number" min={0} step={0.5} value={shareClass.borrowMultiplier || 0} placeholder={String(form.borrowMultiplier)} onChange={(e) => setShareClass(shareClass.id, { borrowMultiplier: Number(e.target.value) })} className="w-16 min-h-[40px] px-2 rounded-lg border border-border-strong font-mono text-xs" />
                     {str('× savings (max loan)', '× ntandikwa (banja nnyo)')}
                   </label>
                   <button type="button" onClick={() => setShareClass(shareClass.id, { interestBearing: shareClass.interestBearing === false })} className={`min-h-[40px] px-2.5 rounded-lg border text-[11px] font-bold ${shareClass.interestBearing === false ? 'bg-white text-text-muted border-border-line' : 'bg-status-ok-bg text-status-ok-tx border-emerald-300'}`}>
                     {shareClass.interestBearing === false ? str('No interest', 'Ssali y\'obusaba') : str('Earns interest', 'Yasoma ssali')}
                   </button>
                 </div>
               </div>
             ))}
           </div>
         </div>
         <div className="border-t border-border-line pt-3 space-y-2">
           <div className="flex items-center justify-between gap-2">
             <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
               {str('SACCO registration', 'Ebikwata bya SACCO')}
               <InfoTip label={str('About SACCO details', 'Kikwata ebikwata bya SACCO')} language={language}>{str('Only registered SACCOs need these. They appear on the member register and the equity statement.', 'Ebizibu ebiri ku banjakizanya ebikwata bino. Bisigala ku kiseera ky’abakyala n’ekitabo kya buli mmemba.')}</InfoTip>
             </h3>
             <button type="button" onClick={() => setForm({ ...form, sacco: { ...form.sacco, registeredOn: new Date().toISOString().slice(0, 10) } })} className="min-h-[40px] px-3 rounded-lg bg-surface-container border border-border-line text-primary text-xs font-bold">{str('Mark as SACCO', 'Buta nga SACCO')}</button>
           </div>
           <div className="grid grid-cols-2 gap-2">
             <div className="col-span-2">
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Registration number', 'Namba y’okwaako')}</label>
               <input value={form.sacco.registrationNo || ''} onChange={(e) => setForm({ ...form, sacco: { ...form.sacco, registrationNo: e.target.value } })} placeholder="e.g. UG/SACCO/2019/142" className={inputCls} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Registered on', 'Bwaako ku')}</label>
               <input type="date" value={form.sacco.registeredOn || ''} onChange={(e) => setForm({ ...form, sacco: { ...form.sacco, registeredOn: e.target.value } })} className={inputCls} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Savings interest % / cycle', 'Ssali y’entandikwa % / kizibu')}</label>
               <input type="number" min={0} max={100} step={0.5} value={form.sacco.savingsInterestRatePct || 0} onChange={(e) => setForm({ ...form, sacco: { ...form.sacco, savingsInterestRatePct: Number(e.target.value) } })} className={`${inputCls} font-mono`} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('County', 'Eggwanga')}</label>
               <input value={form.sacco.county || ''} onChange={(e) => setForm({ ...form, sacco: { ...form.sacco, county: e.target.value } })} className={inputCls} />
             </div>
             <div>
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('District', 'Eggganga')}</label>
               <input value={form.sacco.district || ''} onChange={(e) => setForm({ ...form, sacco: { ...form.sacco, district: e.target.value } })} className={inputCls} />
             </div>
             <div className="col-span-2">
               <label className="text-[11px] font-bold text-text-muted uppercase block mb-1">{str('Legal name (if different)', 'Erinina ekikwata (bwe kitandikwa) ')}</label>
               <input value={form.sacco.legalName || ''} onChange={(e) => setForm({ ...form, sacco: { ...form.sacco, legalName: e.target.value } })} className={inputCls} />
             </div>
           </div>
           <p className="text-[11px] text-text-muted">
             {str('Savings interest is shown separately on the member register and equity statement, and is added to a member’s savings when a cycle closes.', 'Ssali y’entandikwa eragala nnyo ku kiseera ky’abakyala n’ekitabo kya buli mmemba, era yongerwa ku ntandikwa eri ku mmemba nga kizibu kikikibwa.')}
           </p>

          {/* Surplus appropriation — a registered SACCO builds its reserve before
              it pays a dividend. Off by default: a village group keeps the whole
              surplus exactly as before. */}
          <div className="rounded-lg border border-border-line bg-canvas-bg p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                {str('Surplus at share-out', 'Ssali y’okugaba emigabo')}
                <InfoTip label={str('About the surplus', 'Kikwata ssali')}>{str('Loan interest is the group’s income, not yours. Set aside the shares below, and members are paid what is left.', 'Ssali g’ebyewolo gye kikwata ekibiina, siwaako. Bika ebisigala ebiri ku mmeeera era abakiise bagabwa ekisigala.')}</InfoTip>
              </h4>
              <button
                type="button"
                onClick={() => setSacco({ surplusPolicy: form.sacco.surplusPolicy ? undefined : { ...RECOMMENDED_SURPLUS_POLICY } })}
                className={`min-h-[40px] px-3 rounded-lg border text-xs font-bold ${form.sacco.surplusPolicy ? 'bg-primary-container text-white border-primary-container' : 'bg-surface-container border-border-line text-primary'}`}
              >
                {form.sacco.surplusPolicy ? str('On', 'Kiiso') : str('Off', 'Tekigendera')}
              </button>
            </div>
            {!form.sacco.surplusPolicy ? (
              <p className="text-[11px] text-text-muted">
                {str('Off: the whole loan interest is paid to members at share-out. Turn this on to build a reserve first.', 'Tekigendera: ssali gonna g’ebyewolo giggibwa abakiise. Yikola nino okwongera ekizimbeero nga okumala.')}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-text-muted">
                    {str('Split the loan interest as:', 'Gawanya ssali g’ebyewolo bw’ensi:')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSacco({ surplusPolicy: { ...RECOMMENDED_SURPLUS_POLICY } })}
                    className="text-[11px] font-bold text-secondary underline min-h-[32px] px-2"
                  >
                    {str('Use 20 / 10 / 5', 'Yobeka 20 / 10 / 5')}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['reservePct', str('Reserve %', 'Ekizimbeero %')],
                    ['educationPct', str('Education %', 'Ebisoma %')],
                    ['operationsPct', str('Operations %', 'Abalimi %')],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.sacco.surplusPolicy?.[key] ?? 0}
                        onChange={(e) => setSacco({ surplusPolicy: normalizePolicy({ ...form.sacco.surplusPolicy, [key]: Number(e.target.value) }) })}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">{str('Quorum % of members', 'Abali ku % nga kikwata')}</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.sacco.surplusPolicy?.quorumPct ?? 50}
                      onChange={(e) => setSacco({ surplusPolicy: normalizePolicy({ ...form.sacco.surplusPolicy, quorumPct: Number(e.target.value) }) })}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSacco({ surplusPolicy: normalizePolicy({ ...form.sacco.surplusPolicy, finesToBonus: form.sacco.surplusPolicy?.finesToBonus === false }) })}
                    className={`w-full min-h-[48px] rounded-lg border px-2 text-[11px] font-bold ${form.sacco.surplusPolicy?.finesToBonus === false ? 'bg-primary-container text-white border-primary-container' : 'bg-surface-container border-border-line text-primary'}`}
                  >
                    {form.sacco.surplusPolicy?.finesToBonus === false
                      ? str('Fines → operations', 'Engassi → abalimi')
                      : str('Fines → members', 'Engassi → abakiise')}
                  </button>
                </div>
                {(() => {
                  const preview = buildSurplusPlan(100000, 0, normalizePolicy(form.sacco.surplusPolicy));
                  return (
                    <div className={`rounded-lg p-2.5 text-[11px] ${preview.usable ? 'bg-status-ok-bg text-status-ok-tx' : 'bg-status-bad-bg text-status-bad-tx'}`}>
                      {preview.usable ? (
                        <>
                          <span className="font-bold">{str('Members receive', 'Abakiise bagaba')}</span>{' '}
                          <span className="font-mono font-bold">{preview.bonusPct}%</span>{' '}
                          {str('of every shilling of loan interest. The rest builds the group.', 'mu buli ssali y’ebiggwelo. Ebisigala ebijja ekibiina.')}
                        </>
                      ) : (
                        preview.problems.join(' ')
                      )}
                    </div>
                  );
                })()}
                <p className="text-[11px] text-text-muted">
                  {str('A share-out is then locked until the members have approved the split in a meeting with a quorum.', 'Okugaba emigabo kukakibwa nga abakiise tebalamutasanyukirizibwanga mu lukiiko nga abali badde.')}
                </p>
              </>
            )}
          </div>
         </div>
         <button type="submit" className="w-full min-h-[48px] bg-primary text-white rounded-lg font-bold text-sm active:scale-[0.99]">
           {str('Save settings', 'Tereka ennanga')}
         </button>
       </form>

       <p className="text-[11px] text-text-muted">
         {str('Share price applies to new share purchases and the wizard. Existing member savings are not recalculated.', 'Omuwendo gw’omugabo gukola ku mugula omupya n’omulimu gwa VSLA. Ssente eziri mu kibiina ky’abakiise tezikozesebwa bulungi.')}
       </p>
    </main>
  );
};

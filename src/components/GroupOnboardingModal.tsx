import React, { useState } from 'react';
import { CreateGroupPayload, GroupSummary, JoinGroupPayload, Language, UserAccount } from '../types';

interface GroupOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  availableGroups: GroupSummary[];
  currentGroupId: string;
  onSelectGroup: (groupId: string) => Promise<void>;
  onCreateGroup: (payload: CreateGroupPayload) => Promise<{ success: boolean; group?: GroupSummary; inviteCode?: string; error?: string; offline?: boolean }>;
  onJoinGroup: (payload: JoinGroupPayload) => Promise<{ success: boolean; groupName?: string; memberNo?: string; error?: string }>;
  defaultTab?: 'register' | 'join' | 'directory';
  /** Strangers (welcome gate) get register/join only — no browsing groups. */
  hideDirectory?: boolean;
}

export const GroupOnboardingModal: React.FC<GroupOnboardingModalProps> = ({
  isOpen,
  onClose,
  language = 'EN',
  availableGroups,
  currentGroupId,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  defaultTab = 'directory',
  hideDirectory = false,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'register' | 'join'>(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    type: 'created' | 'joined';
    groupName: string;
    inviteCode: string;
    memberNo?: string;
    boxId?: string;
    offline?: boolean;
  } | null>(null);

  // Registration Form State
  const [regForm, setRegForm] = useState<CreateGroupPayload>({
    name: '',
    boxIdentifier: '',
    location: '',
     meetingDay: language === 'LU' ? 'Buli lwa kukya 4:00 PM' : 'Every Friday 4:00 PM',
    sharePrice: 10000,
    welfareMonthly: 5000,
    cycleDurationMonths: 10,
    adminName: '',
    adminPhone: '+256 ',
    adminProvider: 'MTN',
    adminPin: '',
    plan: 'pro',
  });

  // Join Form State
  const [joinForm, setJoinForm] = useState<JoinGroupPayload>({
    inviteCode: '',
    memberName: '',
    phone: '+256 ',
    provider: 'MTN',
    nationalId: '',
    pin: '',
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const str = (en: string, lu: string) => language === 'LU' ? lu : en;

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (!regForm.name.trim()) {
      setFeedbackError(str('Please provide a savings group or association name.', 'Londa erinnya ly\'ekibiina ky\'ensimbi kwa mukwayama.'));
      return;
    }
    if (!regForm.adminName.trim() || regForm.adminPhone.trim().length < 8) {
      setFeedbackError(str('Please provide the General Secretary / Admin name and phone number.', 'Londa erinnya n\'enamba y\'essimu y\'Omuwandiisi / Admin.'));
      return;
    }
    if (!/^\d{4}$/.test(regForm.adminPin) || regForm.adminPin === '1234') {
      setFeedbackError(str('Choose a private 4-digit PIN that is not 1234.', 'Londa PIN ekyekuuka, ebirimu mannya 4, era tebweza 1234.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onCreateGroup(regForm);
      if (res.success && res.group) {
        setSuccessInfo({
          type: 'created',
          groupName: res.group.name,
          inviteCode: res.group.inviteCode,
          boxId: res.group.boxIdentifier,
          offline: res.offline,
        });
      } else {
        setFeedbackError(res.error || str('Failed to register group. Please check parameters.', 'Kikikwaze okwandiisa ekibiina. Kebera ebisobozesebwa.'));
      }
    } catch (err: any) {
      setFeedbackError(err.message || str('An unexpected error occurred during group registration.', 'Waliwo ekikyamu ekasikiriza nga kandiisa ekibiina.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    if (!joinForm.inviteCode.trim()) {
      setFeedbackError(str('Please enter the group invite code from your secretary.', 'Yingiza koodi y\'ekibiina oyikoleetse Omuwandiisi.'));
      return;
    }
    if (!joinForm.memberName.trim() || joinForm.phone.trim().length < 8) {
      setFeedbackError(str('Please enter your full name and mobile phone number.', 'Yingiza erinnya lyo eggwanga era enamba y\'essimu y\'omukozzi.'));
      return;
    }
    if (!/^\d{4}$/.test(joinForm.pin) || joinForm.pin === '1234') {
      setFeedbackError(str('Choose a private 4-digit PIN that is not 1234.', 'Londa PIN ekyekuuka, ebirimu mannya 4, era tebweza 1234.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onJoinGroup(joinForm);
      if (res.success) {
        setSuccessInfo({
          type: 'joined',
          groupName: res.groupName || 'Savings Group',
          inviteCode: joinForm.inviteCode.toUpperCase(),
          memberNo: res.memberNo || '01',
        });
      } else {
        setFeedbackError(res.error || str('Could not join group. Verify the invite code with your secretary.', 'Tewali bubweru okuyingira mu kibiina. Kebera koodi n\'Omuwandiisi.'));
      }
    } catch (err: any) {
      setFeedbackError(err.message || str('An error occurred while joining the savings group.', 'Waliwo ekikyamu nga yingira mu kibiina ky\'ensimbi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-surface-card w-full max-w-lg rounded-2xl shadow-2xl border border-border-strong overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-line bg-primary text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[22px] text-secondary">hub</span>
            </div>
            <div>
               <h2 className="text-title-md font-bold leading-tight">{str('VSLA UG Groups', 'Ebibiina bya VSLA UG')}</h2>
               <p className="text-[11px] text-white/80">{str('Multi-tenant group management & self-serve enrollment', 'Kuyimiriza ebibiina n\'okuziyogerako buli kikwata ku kifo')}</p>
            </div>
          </div>
           <button
             type="button"
             aria-label={str('Close group onboarding', 'Ggalawo okuyingiza ekibiina')}
             onClick={onClose}
             className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Success Screen */}
        {successInfo ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-status-ok-bg text-secondary flex items-center justify-center border border-secondary/20 shadow-sm animate-in zoom-in">
              <span className="material-symbols-outlined text-[36px]">
                {successInfo.type === 'created' ? 'verified' : 'how_to_reg'}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-title-lg font-bold text-primary">
                 {successInfo.type === 'created' ? str('Group Successfully Registered!', 'Ekibiina kimaze okwandiiswa!') : str('Successfully Joined Group!', 'Womuzeyo okuyingira mu kibiina!')}
              </h3>
              <p className="text-xs text-text-muted max-w-sm">
                {successInfo.type === 'created'
                   ? str(`Your digital savings box for "${successInfo.groupName}" is live and ready for Meeting #1.`, `Sanduuko yo yasegula y\'ekibiina "${successInfo.groupName}" ekikola era tekibwa ku Lukuŋŋaana #1.`)
                   : str(`You are officially registered as Member #${successInfo.memberNo} in "${successInfo.groupName}".`, `Wawandiiswa bulungi nga Omukiise #${successInfo.memberNo} mu "${successInfo.groupName}".`)}
              </p>
              {successInfo.offline && (
                <p className="text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-2.5 max-w-sm">
                   {str('No network — saved on this phone only. It will sync automatically when you\'re back online. Don\'t uninstall the app or clear its data.', 'Tewali mutimbagano — byefererwa ku ssimu eno. Bwe uzoke mulaba n\'entimbagano, bisinkana nga bwe munene. Toyoonya ku kugyako app oba okufuna ebisobozesebwa byaayo.')}
                </p>
              )}
            </div>

            {/* Invite Code Showcase */}
            <div className="w-full bg-canvas-bg border border-border-strong rounded-xl p-4 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                   {str('Group Member Invite Code', 'Koodi y\'Okuyingiza Abakiise')}
                </span>
                <span className="text-[10px] text-secondary font-bold px-1.5 py-0.5 bg-secondary/10 rounded">
                   {str('Active', 'Ekikola')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-surface-card p-3 rounded-lg border border-border-line">
                <span className="text-headline-sm font-mono font-bold tracking-widest text-primary">
                  {successInfo.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(successInfo.inviteCode)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-primary/90 transition active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedCode ? 'done' : 'content_copy'}
                  </span>
                   <span>{copiedCode ? str('Copied', 'Kikoppolwedde') : str('Copy', 'Koppa')}</span>
                </button>
              </div>
              <p className="text-[11px] text-text-muted">
                 {str('Share this code with members via SMS or WhatsApp so they can join and view their passbook.', 'Gabana koodi eno eri abakiise ku SMS oba WhatsApp bayeyanga okuyingira nokulaba ppaasibuku zaabwe.')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  language === 'LU'
                   ? `*Yingira mu kibiina kyaffe ky\'ensimbi "${successInfo.groupName}"*\nKoodi y\'Ekibiina: *${successInfo.inviteCode}*\nLaba ppaasibuku ya VSLA n\'ebitabo by\'olukuŋŋaana online oba offline.`
                   : `*Join our savings group "${successInfo.groupName}"*\nGroup Code: *${successInfo.inviteCode}*\nAccess your digital VSLA passbook and weekly records online or offline.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-[#25D366] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs hover:brightness-105 transition"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                 {str('Share to WhatsApp', 'Gabana ku WhatsApp')}
              </a>
              <button
                type="button"
                onClick={() => {
                  setSuccessInfo(null);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 bg-primary text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 transition"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                 {str('Open Group Dashboard', 'Ggulawo dashboard y\'ekibiina')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs Navigation */}
            <div className="flex border-b border-border-line bg-surface-container-low shrink-0 px-3 pt-2">
              {!hideDirectory && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('directory');
                  setFeedbackError(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'directory'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">domain</span>
                <span>                 {str(`All Groups (${availableGroups.length})`, `Ebibiina byonna (${availableGroups.length})`)}</span>
              </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setFeedbackError(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'register'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                 <span>{str('Register New Group', 'Wandiisa Ekibiina Kipya')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('join');
                  setFeedbackError(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'join'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">key</span>
                 <span>{str('Join with Code', 'Yingira ku Koodi')}</span>
              </button>
            </div>

            {/* Error Banner */}
            {feedbackError && (
              <div className="mx-4 mt-3 p-3 rounded-lg bg-status-fail-bg border border-error/30 text-error text-xs flex items-start gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="flex-1">{feedbackError}</span>
              </div>
            )}

            {/* Tab 1: Groups Directory (Switch) */}
            {activeTab === 'directory' && (
              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                <div className="flex items-center justify-between pb-1">
                  <p className="text-xs text-text-muted">
                     {str('Switch seamlessly between your registered community savings groups:', 'Kyusa nga obulungi mu bibiina by\'ensimbi by\'ekizibu ebiriwo mu mbutukiro:')}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {availableGroups.map((grp) => {
                    const isCurrent = grp.id === currentGroupId;
                    return (
                      <div
                        key={grp.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-status-ok-bg/30 border-secondary ring-1 ring-secondary/40'
                            : 'bg-surface-card border-border-strong hover:border-primary/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-on-surface text-sm">{grp.name}</span>
                            <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] font-bold rounded">
                              {grp.boxIdentifier}
                            </span>
                            <span className="px-1.5 py-0.2 bg-surface-container text-text-muted text-[10px] font-mono rounded">
                               {str('Code', 'Koodi')}: {grp.inviteCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                             <span>{grp.membersCount} {str('Members', 'Abakiise')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent ? (
                            <span className="px-3 py-1.5 bg-secondary text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                               {str('Active Group', 'Ekibiina Ekikola')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                setIsSubmitting(true);
                                await onSelectGroup(grp.id);
                                setIsSubmitting(false);
                                onClose();
                              }}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 bg-surface-container hover:bg-primary hover:text-white border border-border-strong rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 text-primary"
                            >
                              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                               {str('Switch', 'Kyusa')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="w-full py-2.5 border-2 border-dashed border-primary/30 hover:border-primary text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-primary/5 hover:bg-primary/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                     {str('Onboard Another Savings Group', 'Yingiza Ekibiina Kinga ky\'Ensimbi')}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Register New Group Form */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* Section A: Group Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-border-line pb-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">groups</span>
                     <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{str('1. Association Details', '1. Ebisingawo by\'ekibiina')}</h4>
                  </div>

                  <div className="space-y-1">
                     <label className="text-xs font-bold text-on-surface">{str('Group / Association Name *', 'Erinnya ly\'Ekibiina / Mukwayama *')}</label>
                    <input
                      type="text"
                      required
                       placeholder={str('e.g. Kampala Boda Boda Savings Association', 'okulagala: Kampala Boda Boda Savings Association')}
                      value={regForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
                        setRegForm({
                          ...regForm,
                          name,
                          boxIdentifier: prefix ? `BOX-${prefix}-${Math.floor(100 + Math.random() * 900)}` : '',
                        });
                      }}
                      className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Location / Market District', 'Ebbaliwo / Disitrikiti y\'Katale')}</label>
                      <input
                        type="text"
                         placeholder={str('e.g. Wandegeya Market, Kawempe', 'okulagala: Wandegeya Market, Kawempe')}
                        value={regForm.location}
                        onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Meeting Schedule', 'Olukuŋŋaana Olw\'okukyata')}</label>
                      <input
                        type="text"
                         placeholder={str('e.g. Every Friday 4:00 PM', 'okulagala: Buli lwa kukya 4:00 PM')}
                        value={regForm.meetingDay}
                        onChange={(e) => setRegForm({ ...regForm, meetingDay: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Financial Bylaws */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-border-line pb-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">savings</span>
                     <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{str('2. Financial Bylaws', '2. Amateeka g\'Ebikwato')}</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Share Value (UGX)', 'Omuwendo w\'Emigabo (UGX)')}</label>
                      <select
                        value={regForm.sharePrice}
                        onChange={(e) => setRegForm({ ...regForm, sharePrice: Number(e.target.value) })}
                        className="w-full px-2.5 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      >
                        <option value={5000}>UGX 5,000</option>
                         <option value={10000}>UGX 10,000 ({str('Standard', 'Nsuma')})</option>
                        <option value={20000}>UGX 20,000</option>
                        <option value={50000}>UGX 50,000</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Monthly Welfare (UGX)', 'Obuyambi bw\'Mwezi (UGX)')}</label>
                      <select
                        value={regForm.welfareMonthly}
                        onChange={(e) => setRegForm({ ...regForm, welfareMonthly: Number(e.target.value) })}
                        className="w-full px-2.5 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      >
                        <option value={2000}>UGX 2,000</option>
                         <option value={5000}>UGX 5,000 ({str('Standard', 'Nsuma')})</option>
                        <option value={10000}>UGX 10,000</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Cycle Length', 'Obudde bw\'Enziringana')}</label>
                      <select
                        value={regForm.cycleDurationMonths}
                        onChange={(e) => setRegForm({ ...regForm, cycleDurationMonths: Number(e.target.value) })}
                        className="w-full px-2.5 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      >
                         <option value={9}>9 {str('Months', 'Mwezi')}</option>
                         <option value={10}>10 {str('Months (Standard)', 'Mwezi (Nsuma)')}</option>
                         <option value={12}>12 {str('Months (Full Year)', 'Mwezi (Mwaka Igw\'emu)')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section C: First Administrator / Secretary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-border-line pb-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                     <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{str('3. Secretary / Administrator', '3. Omuwandiisi / Admin')}</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Admin Full Name *', 'Erinnya ly\'Admin *')}</label>
                      <input
                        type="text"
                        required
                         placeholder={str('e.g. Mark Michael Kato', 'okulagala: Mark Michael Kato')}
                        value={regForm.adminName}
                        onChange={(e) => setRegForm({ ...regForm, adminName: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Admin Mobile Phone *', 'Essimu y\'Admin *')}</label>
                      <input
                        type="text"
                        required
                        placeholder="+256 772 123456"
                        value={regForm.adminPhone}
                        onChange={(e) => setRegForm({ ...regForm, adminPhone: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Network Provider', 'Omulabi wa Network')}</label>
                      <select
                        value={regForm.adminProvider}
                        onChange={(e) => setRegForm({ ...regForm, adminProvider: e.target.value as 'MTN' | 'Airtel' })}
                        className="w-full px-2.5 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                      >
                        <option value="MTN">MTN MoMo</option>
                        <option value="Airtel">Airtel Money</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Admin Box PIN (4-Digits)', 'PIN ya Admin y\'Sanduuko (Amannya 4)')}</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="1234"
                        value={regForm.adminPin}
                        onChange={(e) => setRegForm({ ...regForm, adminPin: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden text-center font-mono tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-3 border-t border-border-line">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                         <span>{str('Provisioning Multi-Tenant Group...', 'Buzibu ekibiina...')}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                         <span>{str('Launch & Register Savings Group', 'Gala n\'wandiisa ekibiina ky\'ensimbi')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Join Group Form */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoinSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5 text-xs text-text-muted">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
                   <p>
                     {str('Enter the 6-character Group Invite Code provided by your savings group secretary or chairperson to access your digital passbook.', 'Yingiza Koodi y\'Ekibiina e\'ebiri ey\'olukalu 6 oyikoleetse Omuwandiisi kama Ssabataka okujja mu ppaasibuku yo yasegula.')}
                   </p>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold text-on-surface">{str('Group Invite Code *', 'Koodi y\'Ekibiina *')}</label>
                  <input
                    type="text"
                    required
                     placeholder={str('e.g. BAK-4290 or KIB-8821', 'okulagala: BAK-4290 oba KIB-8821')}
                    value={joinForm.inviteCode}
                    onChange={(e) => setJoinForm({ ...joinForm, inviteCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 text-sm font-mono tracking-widest uppercase border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden font-bold text-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-on-surface">{str('Your Full Name *', 'Erinnya lyo *')}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Nalubega"
                      value={joinForm.memberName}
                      onChange={(e) => setJoinForm({ ...joinForm, memberName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                       <label className="text-xs font-bold text-on-surface">{str('Your Mobile Phone *', 'Essimu yo *')}</label>
                    <input
                      type="text"
                      required
                      placeholder="+256 701 223344"
                      value={joinForm.phone}
                      onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-on-surface">{str('Network', 'Muwuk')}</label>
                    <select
                      value={joinForm.provider}
                      onChange={(e) => setJoinForm({ ...joinForm, provider: e.target.value as 'MTN' | 'Airtel' })}
                      className="w-full px-2.5 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden"
                    >
                      <option value="MTN">MTN MoMo</option>
                      <option value="Airtel">Airtel Money</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-on-surface">{str('Set 4-Digit Passbook PIN', 'Londa PIN y\'ppaasibuku ebirimu mannya 4')}</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      value={joinForm.pin}
                      onChange={(e) => setJoinForm({ ...joinForm, pin: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-border-strong rounded-lg bg-canvas-bg focus:border-primary focus:outline-hidden text-center font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border-line">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-secondary hover:brightness-105 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                         <span>{str('Enrolling Member...', 'Buyinja omukiise...')}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                         <span>{str('Join Group & Open Passbook', 'Yingira mu kibiina era ggulawo ppaasibuku')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

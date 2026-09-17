import React, { useState } from 'react';
import { Language, MainTab, ScreenId } from '../types';
import { getTranslations } from '../i18n/translations';

interface BottomNavBarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  pendingApprovalsCount: number;
  onNavigateScreen: (screen: ScreenId) => void;
  language?: Language;
  /** Simple Mode: 4 tabs for the Friday loop. Default ON. */
  simpleMode?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  pendingApprovalsCount,
  onNavigateScreen,
  language = 'EN',
  simpleMode = true,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const t = getTranslations(language);

  const tabBtn = (
    tab: MainTab,
    screen: ScreenId,
    icon: string,
    label: string,
    badge?: number
  ) => (
    <button
      onClick={() => {
        onTabChange(tab);
        onNavigateScreen(screen);
      }}
      className={`relative flex flex-col items-center justify-center px-2 py-1 min-h-[52px] min-w-[56px] rounded-lg transition-colors active:scale-95 ${
        activeTab === tab
          ? 'bg-primary-container text-white shadow-sm'
          : 'text-text-muted hover:bg-surface-container-low'
      }`}
      type="button"
    >
      <span
        className="material-symbols-outlined text-[24px]"
        style={{ fontVariationSettings: activeTab === tab ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>
      <span className="font-semibold tracking-tight mt-0.5 text-[11px]">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-0.5 rounded-full bg-status-warn-bg text-status-warn-tx font-bold text-[10px] border border-[#FDE68A]">
          {badge}
        </span>
      )}
    </button>
  );

  // ---- SIMPLE MODE: Home + Meeting + Passbook + Approvals. Nothing else. ----
  if (simpleMode) {
    return (
      <nav
        aria-label="Main Mobile Navigation"
        className="fixed bottom-0 left-0 w-full z-50 bg-surface-card border-t border-border-line shadow-[0px_-2px_10px_rgba(0,0,0,0.06)]"
      >
        <div className="max-w-lg mx-auto flex justify-around items-center px-2 py-1.5">
          {tabBtn('home', 'home', 'home', t.nav.home)}
          {tabBtn('meetings', 'meeting_wizard', 'event', t.nav.meetings)}
          {tabBtn('members', 'member_passbook', 'groups', t.nav.members)}
          {tabBtn('approvals', 'approvals', 'rule', t.nav.approvals, pendingApprovalsCount)}
        </div>
      </nav>
    );
  }

  const handleMoreClick = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  const handleSelectMoreOption = (screen: ScreenId, tab: MainTab) => {
    setShowMoreMenu(false);
    onTabChange(tab);
    onNavigateScreen(screen);
  };

  return (
    <>
      {/* More / Auxiliary Modules Modal Sheet */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-card rounded-t-2xl p-4 space-y-2.5 shadow-2xl border-t border-border-line mb-16 animate-in slide-in-from-bottom duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-border-strong rounded-full mx-auto mb-2" />
            <div className="flex items-center justify-between pb-2 border-b border-border-line">
              <span className="font-bold text-primary text-headline-sm">
                {language === 'LU'
                  ? 'Ebikwata ku Kibiina kya Bakwata'
                   : 'Bakwata VSLA Modules'}
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="text-text-muted hover:text-primary p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => handleSelectMoreOption('backup', 'more')}
                className="col-span-2 p-3 text-left rounded-lg bg-status-ok-bg/30 border-2 border-secondary/50 hover:border-secondary active:bg-surface-container transition-all flex items-start gap-2.5 shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm block text-primary">
                      {t.home.backupAudit}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-secondary text-white text-[10px] font-mono font-bold">
                      SYNC
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {t.home.backupAuditSub}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('welfare_fund', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-status-ok-bg text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {t.home.welfareFund}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Enkoba y\'Obuyambi'  : 'Emergency fund'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('constitution_fines', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Ssemateeka n\'Engassi'  : 'Constitution & Fines'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Amateeka n\'Emisoso'  : 'Bylaws & penalties'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('share_out', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-status-warn-tx flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Okugaba Emigabo'  : 'Cycle Share-Out'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Amagoba n\'Emigabo'  : 'Dividends & Payouts'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('audio_broadcast', 'meetings')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">volume_up</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Amaloboozi n\'Olukuŋŋaana'  : 'Audio Broadcast'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Omubazi Ayogera ku Ssimu'  : 'Voice summary'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('legal', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">policy</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {t.legal.title}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Amateeka n\'ebyama'  : 'Terms, privacy, bylaws'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('momo_push', 'meetings')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FEF9C3] text-[#854D0E] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">send_to_mobile</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Sindiika MoMo Push'  : 'Send MoMo Push'}
                  </span>
                  <span className="text-[11px] text-text-muted">MTN & Airtel Money</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('reports', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Lipoota z\'Ensimbi'  : 'Financial Reports'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Amabanja ne CSV'  : 'Arrears, exports & health'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('shop', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-status-warn-tx flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">storefront</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Kaduuka'  : 'Group Shop'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Ebintu n\'amagoba'  : 'Stock, sales & profit'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('help', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">help</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Buyambi'  : 'Help & Support'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Ebyokuddamu ne WhatsApp'  : 'FAQs & WhatsApp'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('about', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">info</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Ebikwata ku App'  : 'About the App'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Kyiki n\'okugiteeka'  : 'What it does & install'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('meeting_close', 'meetings')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Ggalawo Sanduuko'  : 'Close Box'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Bala ssente n\'ebisumuluzo'  : 'Reconcile & Padlock'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('users', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Abakozesa'  : 'Users & Roles'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Buli akkozesa n\'obuyinza'  : 'Logins & permissions'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMoreOption('group_settings', 'more')}
                className="p-3 text-left rounded-lg bg-canvas-bg border border-border-line hover:border-primary active:bg-surface-container transition-all flex items-start gap-2.5"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </div>
                <div>
                  <span className="font-bold text-sm block text-primary">
                    {language === 'LU' ? 'Enteekateeka y\'Ekibiina'  : 'Group Settings'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {language === 'LU' ? 'Erinya, emigabo, enkoba'  : 'Name, shares, welfare'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Main Mobile Navigation"
        className="fixed bottom-0 left-0 w-full z-50 bg-surface-card border-t border-border-line shadow-[0px_-2px_10px_rgba(0,0,0,0.06)]"
      >
        <div className="max-w-lg mx-auto flex justify-around items-center px-2 py-1.5 h-16">
          {/* Tab 1: Home */}
          <button
            onClick={() => {
              onTabChange('home');
              onNavigateScreen('home');
            }}
            className={`flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors active:scale-95 ${
              activeTab === 'home'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-container-low'
            }`}
            type="button"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}
            >
              home
            </span>
            <span className="text-label-sm font-label-sm font-semibold tracking-tight mt-0.5">
              {t.nav.home}
            </span>
          </button>

          {/* Tab 2: Meetings — guided wizard (step-by-step, village-proof) */}
          <button
            onClick={() => {
              onTabChange('meetings');
              onNavigateScreen('meeting_wizard');
            }}
            className={`flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors active:scale-95 ${
              activeTab === 'meetings'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-container-low'
            }`}
            type="button"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'meetings' ? "'FILL' 1" : "'FILL' 0" }}
            >
              event
            </span>
            <span className="text-label-sm font-label-sm font-semibold tracking-tight mt-0.5">
              {t.nav.meetings}
            </span>
          </button>

          {/* Tab 3: Members / Passbook */}
          <button
            onClick={() => {
              onTabChange('members');
              onNavigateScreen('member_passbook');
            }}
            className={`flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors active:scale-95 ${
              activeTab === 'members'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-container-low'
            }`}
            type="button"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'members' ? "'FILL' 1" : "'FILL' 0" }}
            >
              groups
            </span>
            <span className="text-label-sm font-label-sm font-semibold tracking-tight mt-0.5">
              {t.nav.members}
            </span>
          </button>

          {/* Tab 4: Loans */}
          <button
            onClick={() => {
              onTabChange('loans');
              onNavigateScreen('new_loan');
            }}
            className={`flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors active:scale-95 ${
              activeTab === 'loans'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-container-low'
            }`}
            type="button"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'loans' ? "'FILL' 1" : "'FILL' 0" }}
            >
              account_balance
            </span>
            <span className="text-label-sm font-label-sm font-semibold tracking-tight mt-0.5">
              {t.nav.loans}
            </span>
          </button>

          {/* Tab 5: Approvals / Review Queue */}
          <button
            onClick={() => {
              onTabChange('approvals');
              onNavigateScreen('approvals');
            }}
            className={`relative flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors active:scale-95 ${
              activeTab === 'approvals'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-container-low'
            }`}
            type="button"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: activeTab === 'approvals' ? "'FILL' 1" : "'FILL' 0" }}
            >
              rule
            </span>
            <span className="text-label-sm font-label-sm font-semibold tracking-tight mt-0.5">
              {t.nav.approvals}
            </span>
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-status-warn-bg text-status-warn-tx font-bold text-[10px] border border-[#FDE68A]">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {/* Tab 6: More / Menu drawer */}
          <button
            onClick={handleMoreClick}
            className={`flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[44px] rounded-lg transition-colors active:scale-95 ${
              activeTab === 'more'
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-container-low'
            }`}
            type="button"
            title={t.nav.more}
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
            <span className="text-label-sm font-label-sm font-semibold tracking-tight mt-0.5">
              {t.nav.more}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

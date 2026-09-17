import React, { useState } from 'react';
import { Language } from '../types';

export interface NewMemberInput {
  firstName: string;
  lastName: string;
  phone: string;
  provider: 'MTN' | 'Airtel';
  nationalId: string;
  village: string;
  kinName: string;
  kinPhone: string;
  guarantorName: string;
  guarantorPhone: string;
  business: string;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (input: NewMemberInput) => string | null;
  language?: Language;
  nextMemNumber?: string;
  nextMemberNo?: string;
}

/** Member registration with next-of-kin + guarantor fields and MEM number preview. */
export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onRegister, language = 'EN', nextMemNumber, nextMemberNo }) => {
  const [form, setForm] = useState<NewMemberInput>({
    firstName: '', lastName: '', phone: '', provider: 'MTN',
    nationalId: '', village: '', kinName: '', kinPhone: '', guarantorName: '', guarantorPhone: '', business: '',
  });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const str = (en: string, lu: string) =>
    language === 'LU' ? lu  : en;
  const set = (k: keyof NewMemberInput, v: string) => setForm({ ...form, [k]: v });
  const inputCls = 'w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm';

  const submit = () => {
    const err = onRegister(form);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setForm({ firstName: '', lastName: '', phone: '', provider: 'MTN', nationalId: '', village: '', kinName: '', kinPhone: '', guarantorName: '', guarantorPhone: '', business: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-2.5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#00261b]">{str('Register new member', 'Wandiisa omukiise')}</h2>
          {(nextMemNumber || nextMemberNo) && (
            <span className="text-[10px] font-mono font-bold bg-[#0b3d2e] text-white px-2 py-1 rounded">
              {nextMemNumber || ''}{nextMemberNo ? ` · #${nextMemberNo}` : ''}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder={str('First name', 'Erinya')} className={inputCls} />
          <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder={str('Last name', 'Erinya ly\'ekika')} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" placeholder={str('07XX XXX XXX (optional)', '07XX XXX XXX (si kyetaagisa)')} className={inputCls} />
          <select value={form.provider} onChange={(e) => set('provider', e.target.value as 'MTN' | 'Airtel')} className={`${inputCls} bg-white`}>
            <option value="MTN">MTN</option>
            <option value="Airtel">Airtel</option>
          </select>
        </div>
        <input value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} placeholder={str('National ID (optional)', 'Endaga muntu')} className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.village} onChange={(e) => set('village', e.target.value)} placeholder={str('Village / zone', 'Ekyalo')} className={inputCls} />
          <input value={form.business} onChange={(e) => set('business', e.target.value)} placeholder={str('Business', 'Bizinesi')} className={inputCls} />
        </div>
        <p className="text-[11px] font-bold text-[#4B5563] uppercase">{str('Next of kin', 'Ow\'oluganda')}</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.kinName} onChange={(e) => set('kinName', e.target.value)} placeholder={str('Kin name', 'Erinya')} className={inputCls} />
          <input value={form.kinPhone} onChange={(e) => set('kinPhone', e.target.value)} inputMode="tel" placeholder="07XX XXX XXX" className={inputCls} />
        </div>
        <p className="text-[11px] font-bold text-[#4B5563] uppercase">{str('Guarantor (member)', 'Omuyima')}</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.guarantorName} onChange={(e) => set('guarantorName', e.target.value)} placeholder={str('Guarantor name', 'Erinya ly\'omuyima')} className={inputCls} />
          <input value={form.guarantorPhone} onChange={(e) => set('guarantorPhone', e.target.value)} inputMode="tel" placeholder="07XX XXX XXX" className={inputCls} />
        </div>
        {error && <p className="text-[11px] font-bold text-[#B91C1C]">{error}</p>}
        <button type="button" onClick={submit} className="w-full min-h-[48px] bg-[#006d30] text-white rounded-lg font-bold text-sm active:scale-[0.99]">
          {str('Register member', 'Wandiisa')}
        </button>
        <button type="button" onClick={onClose} className="w-full min-h-[44px] text-xs font-bold text-[#4B5563]">
          {str('Cancel', 'Sazaamu')}
        </button>
      </div>
    </div>
  );
};

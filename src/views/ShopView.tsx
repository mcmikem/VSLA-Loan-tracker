import React, { useState } from 'react';
import { Language, ScreenId, ShopProduct } from '../types';
import { smsHref, waHref } from '../utils/smsReminders';

export interface NewProductInput {
  name: string;
  sellerType: 'group' | 'member';
  sellerName: string;
  sellerPhone?: string;
  kind?: 'product' | 'service';
  costPrice: number;
  salePrice: number;
  stockQty: number;
  unit: string;
}

export interface SaleInput {
  productId: string;
  qty: number;
  unitPrice: number;
  buyer: string;
  method: 'cash' | 'momo';
}

interface ShopViewProps {
  products: ShopProduct[];
  boxCashBalance: number;
  onNavigate: (screen: ScreenId) => void;
  onAddProduct: (input: NewProductInput) => string | null;
  onSell: (sale: SaleInput) => void;
  onAddExpense: (label: string, amount: number) => void;
  language?: Language;
  currentUserName?: string;
  currentUserPhone?: string;
}

/**
 * Shop / marketplace: group stock (cash-checked) and member businesses.
 * Group profit flows back into the loan fund on every sale.
 */
export const ShopView: React.FC<ShopViewProps> = ({
  products,
  boxCashBalance,
  onNavigate,
  onAddProduct,
  onSell,
  onAddExpense,
  language = 'EN',
  currentUserName = '',
  currentUserPhone = '',
}) => {
  const [tab, setTab] = useState<'group' | 'member'>('group');
  const [showAdd, setShowAdd] = useState(false);
  const [sellId, setSellId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState(0);
  const [form, setForm] = useState({ name: '', sellerName: '', sellerPhone: '', kind: 'product' as 'product' | 'service', costPrice: '', salePrice: '', stockQty: '', unit: 'pcs' });
  const [sellForm, setSellForm] = useState({ qty: '1', unitPrice: '', buyer: '', method: 'cash' as 'cash' | 'momo' });
  const [expLabel, setExpLabel] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const str = (en: string, lu: string) =>
    language === 'LU' ? lu  : en;

  const visible = products.filter((p) => p.sellerType === tab);
  const sellProduct = products.find((p) => p.id === sellId);

  const submitAdd = () => {
    const err = onAddProduct({
      name: form.name.trim(),
      sellerType: tab,
      sellerName: tab === 'member' ? (form.sellerName.trim() || currentUserName) : form.sellerName.trim(),
      sellerPhone: tab === 'member' ? (form.sellerPhone.trim() || currentUserPhone) : undefined,
      kind: tab === 'member' ? form.kind : 'product',
      costPrice: Math.floor(Number(form.costPrice) || 0),
      salePrice: Math.floor(Number(form.salePrice) || 0),
      stockQty: Math.floor(Number(form.stockQty) || 0),
      unit: form.unit.trim() || (tab === 'member' && form.kind === 'service' ? 'session' : 'pcs'),
    });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setShowAdd(false);
    setForm({ name: '', sellerName: '', sellerPhone: '', kind: 'product', costPrice: '', salePrice: '', stockQty: '', unit: 'pcs' });
  };

  const openAdd = () => {
    // Member listing pre-fills the seller as you — one less thing to type.
    if (tab === 'member' && !form.sellerName && currentUserName) {
      setForm((f) => ({ ...f, sellerName: currentUserName, sellerPhone: currentUserPhone }));
    }
    setAddStep(0);
    setShowAdd(!showAdd);
    setError(null);
  };

  const switchTab = (next: 'group' | 'member') => {
    setTab(next);
    setAddStep(0);
    setError(null);
  };

  const submitSell = () => {
    if (!sellProduct) return;
    onSell({
      productId: sellProduct.id,
      qty: Math.floor(Number(sellForm.qty) || 0),
      unitPrice: Math.floor(Number(sellForm.unitPrice) || sellProduct.salePrice),
      buyer: sellForm.buyer.trim() || 'Walk-in',
      method: sellForm.method,
    });
    setSellId(null);
    setSellForm({ qty: '1', unitPrice: '', buyer: '', method: 'cash' });
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-14 flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-lg bg-white border border-[#CBD5E1] flex items-center justify-center text-[#00261b] active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-[#00261b]">{str('Group Shop', 'Kaduuka k\'Ekibiina')}</h1>
            <p className="text-xs text-[#4B5563]">{str('Stock, sales & profit back to the loan fund', "Magoba gadde mu ssente z'ebyewolo")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-3 py-2 bg-[#00261b] text-white rounded-lg text-xs font-bold active:scale-95"
        >
          + {str('Add', 'Yongera')}
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-xl border border-[#CBD5E1] text-xs font-bold">
        <button type="button" onClick={() => switchTab('group')} className={`flex-1 py-2 rounded-lg transition ${tab === 'group' ? 'bg-[#0b3d2e] text-white' : 'text-[#4B5563]'}`}>
          {str('Group stock', "Ebyamaguzi by'ekibiina")}
        </button>
        <button type="button" onClick={() => switchTab('member')} className={`flex-1 py-2 rounded-lg transition ${tab === 'member' ? 'bg-[#0b3d2e] text-white' : 'text-[#4B5563]'}`}>
          {str('Member businesses', "Bizinesi z'abakiise")}
        </button>
      </div>

      {showAdd && (
        <section className="bg-white rounded-xl border-2 border-[#00261b] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#00261b]">
              {tab === 'group' ? str('Buy stock for the group', 'Gula ebintu by\'ekibiina') : str('List a member business', 'Wandiisa bizinesi')}
            </h3>
            <span className="font-mono text-xs font-bold text-[#4B5563]">{addStep + 1}/3</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`flex-1 h-1.5 rounded-full ${i <= addStep ? 'bg-[#006d30]' : 'bg-[#E5E7EB]'}`} />
            ))}
          </div>

          {/* Step 1: WHAT — name (+ kind for members) */}
          {addStep === 0 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#00261b] block">
                {tab === 'member' && form.kind === 'service'
                  ? str('What service do you offer?', 'Omulembe ki gw\'olina?')
                  : str('What are you selling?', 'Otunda ki?')}
              </label>
              {tab === 'member' && (
                <div className="flex gap-2">
                  {(['product', 'service'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm({ ...form, kind: k, unit: k === 'service' ? 'session' : 'pcs' })}
                      className={`flex-1 min-h-[48px] rounded-lg text-sm font-bold border ${form.kind === k ? 'bg-[#00261b] text-white' : 'bg-white border-[#E5E7EB]'}`}
                    >
                      {k === 'product' ? str('Product', 'Ekintu') : str('Service', 'Omulembe')}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={tab === 'member' && form.kind === 'service' ? str('e.g. Tailoring, Bodaboda', 'e.g. kutunga, bodaboda') : str('e.g. Maize flour', 'e.g. kasava')}
                className="w-full min-h-[52px] border-2 border-[#00261b] rounded-lg px-3 text-base"
              />
              <button
                type="button"
                disabled={!form.name.trim()}
                onClick={() => setAddStep(1)}
                className="w-full min-h-[52px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99] disabled:opacity-40"
              >
                {str('Next →', 'Weeyongereyo →')}
              </button>
            </div>
          )}

          {/* Step 2: MONEY — price big, quantity stepper, unit chips */}
          {addStep === 1 && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#00261b] block">
                {str('Price for one?', 'Mmuwa mmeka ku kimu?')}
              </label>
              <div className="flex items-center rounded-lg border-2 border-[#00261b] overflow-hidden bg-white">
                <span className="px-3 py-2 text-sm font-bold font-mono text-[#4B5563] bg-[#F6F7F6]">UGX</span>
                <input
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  inputMode="numeric"
                  placeholder="10,000"
                  className="flex-1 min-h-[52px] px-3 text-lg font-mono font-bold focus:outline-none"
                />
              </div>
              {tab === 'group' && (
                <div>
                  <label className="text-sm font-bold text-[#00261b] block mb-1">
                    {str('What does one cost the group?', 'Kimu kigula mmeka?')}
                  </label>
                  <div className="flex items-center rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
                    <span className="px-3 py-2 text-sm font-mono text-[#4B5563] bg-[#F6F7F6]">UGX</span>
                    <input
                      value={form.costPrice}
                      onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                      inputMode="numeric"
                      placeholder="8,000"
                      className="flex-1 min-h-[52px] px-3 text-base font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}
              <label className="text-sm font-bold text-[#00261b] block pt-1">
                {tab === 'member' && form.kind === 'service'
                  ? str('How many bookings?', 'Ebifo bimeka?')
                  : str('How many are there?', 'Ziri mmeka?')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, stockQty: String(Math.max(0, (Math.floor(Number(form.stockQty) || 0)) - 1)) })}
                  className="w-12 h-12 rounded-lg bg-[#F6F7F6] border border-[#E5E7EB] font-bold text-xl"
                >
                  −
                </button>
                <span className="font-mono font-bold text-2xl w-12 text-center">
                  {Math.floor(Number(form.stockQty) || 0)}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, stockQty: String((Math.floor(Number(form.stockQty) || 0)) + 1) })}
                  className="w-12 h-12 rounded-lg bg-[#00261b] text-white font-bold text-xl"
                >
                  +
                </button>
                <div className="flex gap-1.5 flex-1 flex-wrap">
                  {['pcs', 'kg', 'litre', 'session'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm({ ...form, unit: u })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${form.unit === u || (u === 'pcs' && !form.unit) ? 'bg-[#00261b] text-white' : 'bg-white border-[#E5E7EB]'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              {tab === 'group' && (
                <p className="text-xs text-[#4B5563]">
                  {str('Cash in box:', 'Ssente mu sanduuko:')} <span className="font-mono font-bold">UGX {boxCashBalance.toLocaleString()}</span>
                </p>
              )}
              {error && <p className="text-xs font-bold text-[#B91C1C]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddStep(0)}
                  className="px-4 min-h-[52px] rounded-lg font-bold text-sm bg-[#F6F7F6] border border-[#E5E7EB] active:scale-[0.99]"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={!(Math.floor(Number(form.salePrice) || 0) > 0 && Math.floor(Number(form.stockQty) || 0) > 0)}
                  onClick={() => setAddStep(2)}
                  className="flex-1 min-h-[52px] bg-[#00261b] text-white rounded-lg font-bold text-sm active:scale-[0.99] disabled:opacity-40"
                >
                  {str('Next →', 'Weeyongereyo →')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: WHO + DONE — seller confirm (members) or buy summary (group) */}
          {addStep === 2 && (
            <div className="space-y-2">
              {tab === 'member' ? (
                <>
                  <label className="text-sm font-bold text-[#00261b] block">
                    {str('Who should buyers call?', 'Bakuyite ku namba ki?')}
                  </label>
                  <input
                    value={form.sellerName}
                    onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                    placeholder={str('Your name', 'Erinnya lyo')}
                    className="w-full min-h-[52px] border border-[#E5E7EB] rounded-lg px-3 text-base"
                  />
                  <input
                    value={form.sellerPhone}
                    onChange={(e) => setForm({ ...form, sellerPhone: e.target.value })}
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    className="w-full min-h-[52px] border border-[#E5E7EB] rounded-lg px-3 text-base font-mono"
                  />
                </>
              ) : (
                <div className="p-3 bg-[#F6F7F6] rounded-lg border border-[#E5E7EB] text-sm">
                  <p className="font-bold text-[#00261b]">{form.name || '—'}</p>
                  <p className="font-mono text-[#4B5563]">
                    UGX {Math.floor(Number(form.salePrice) || 0).toLocaleString()} × {Math.floor(Number(form.stockQty) || 0)} = UGX {(Math.floor(Number(form.salePrice) || 0) * Math.floor(Number(form.stockQty) || 0)).toLocaleString()}
                  </p>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    {str('Comes from box cash', 'Ziva mu sanduuko')}
                  </p>
                </div>
              )}
              {error && <p className="text-xs font-bold text-[#B91C1C]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddStep(1)}
                  className="px-4 min-h-[52px] rounded-lg font-bold text-sm bg-[#F6F7F6] border border-[#E5E7EB] active:scale-[0.99]"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={submitAdd}
                  className="flex-1 min-h-[52px] bg-[#006d30] text-white rounded-lg font-bold text-sm active:scale-[0.99]"
                >
                  {tab === 'group' ? str('Buy stock from box cash', 'Gula okuva mu sanduuko') : str('List business', 'Wandiisa')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {visible.length === 0 && (
        <div className="bg-[#FFF8E1] border-2 border-[#EAB308] rounded-xl p-4 text-center space-y-2">
          <p className="text-xs font-bold text-[#00261b]">
            {tab === 'member'
              ? str('No ventures yet — be the first! List your produce, tailoring, bodaboda, salon…', 'Tewali bizinesi — ba asooka! Wandiisa ebyobulimi, kutunga, bodaboda…')
              : str('Nothing here yet. Add the first product above.', 'Tewali kintu. Yongerako ekisooka.')}
          </p>
          <p className="text-[11px] text-[#4B5563]">
            {tab === 'member' && str('When neighbours buy from you, the whole group grows.', 'Abakiise bwe bakugulako, ekibiina kyonna kikula.')}
          </p>
        </div>
      )}

      {visible.map((p) => (
        <div key={p.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#00261b] truncate">
              {p.name}
              {p.sellerType === 'member' && p.kind === 'service' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">{str('SERVICE', 'OMULEMBE')}</span>
              )}
            </p>
            <p className="text-[11px] text-[#4B5563]">
              {p.sellerType === 'member' && p.sellerName ? `${p.sellerName} · ` : ''}
              {str('Price', 'Omutengo')} <span className="font-mono font-bold">{p.salePrice.toLocaleString()}</span>/{p.unit}
            </p>
            <p className="text-[11px] font-mono text-[#4B5563]">
              {p.kind === 'service' ? str('Slots:', 'Ebifo:') : str('Stock:', 'Zisigadde:')} {p.stockQty} · {str('Sold:', 'Zitundiddwa:')} {p.soldQty}
            </p>
          </div>
          <button
            type="button"
            disabled={p.stockQty <= 0}
            onClick={() => { setSellId(p.id); setSellForm({ qty: '1', unitPrice: String(p.salePrice), buyer: '', method: 'cash' }); }}
            className="shrink-0 px-3.5 py-2.5 bg-[#006d30] text-white rounded-lg text-xs font-bold disabled:opacity-40 active:scale-95"
          >
            {str('Sell', 'Tunda')}
          </button>
          </div>
          {tab === 'member' && p.sellerName !== currentUserName && p.stockQty > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={smsHref(p.sellerPhone || '', `${str('Hi', 'Gyoli')} ${p.sellerName || ''}, ${str(`I'm interested in ${p.name} at UGX ${p.salePrice.toLocaleString()}. Still available?`, `Nkwagala ${p.name} ku UGX ${p.salePrice.toLocaleString()}. Ekyaliwo?`)}`)}
                className="py-2 bg-[#0b3d2e] text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">sms</span> {str('Ask to buy', 'Gula')}
              </a>
              <a
                href={waHref(p.sellerPhone || '', `${str('Hi', 'Gyoli')} ${p.sellerName || ''}, ${str(`I'm interested in ${p.name} at UGX ${p.salePrice.toLocaleString()}. Still available?`, `Nkwagala ${p.name} ku UGX ${p.salePrice.toLocaleString()}. Ekyaliwo?`)}`)}
                target="_blank"
                rel="noreferrer"
                className="py-2 bg-[#006d30] text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span> WhatsApp
              </a>
            </div>
          )}
        </div>
      ))}

      {sellProduct && (
        <section className="bg-white rounded-xl border-2 border-[#00261b] p-4 space-y-2">
          <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">
            {str('Sell', 'Tunda')} {sellProduct.name}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input value={sellForm.qty} onChange={(e) => setSellForm({ ...sellForm, qty: e.target.value })} inputMode="numeric" placeholder={str('Qty', 'Omuwendo')} className="min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
            <input value={sellForm.unitPrice} onChange={(e) => setSellForm({ ...sellForm, unitPrice: e.target.value })} inputMode="numeric" placeholder={str('Unit price', 'Omutengo')} className="min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
          </div>
          <input value={sellForm.buyer} onChange={(e) => setSellForm({ ...sellForm, buyer: e.target.value })} placeholder={str('Buyer name (optional)', 'Aguzze (optional)')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
          <div className="flex gap-2">
            {(['cash', 'momo'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setSellForm({ ...sellForm, method: m })} className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold border ${sellForm.method === m ? 'bg-[#00261b] text-white' : 'bg-white border-[#E5E7EB]'}`}>
                {m === 'cash' ? str('Cash', 'Nkalu') : 'MoMo'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={submitSell} className="flex-1 min-h-[48px] bg-[#006d30] text-white rounded-lg font-bold text-sm active:scale-[0.99]">
              {str('Confirm sale', 'Kakasa okutunda')}
            </button>
            <button type="button" onClick={() => setSellId(null)} className="px-4 min-h-[48px] bg-[#F6F7F6] border border-[#E5E7EB] rounded-lg text-xs font-bold">
              {str('Cancel', 'Sazaamu')}
            </button>
          </div>
        </section>
      )}

      {tab === 'group' && (
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
          <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">{str('Shop expense', 'Ssente ezisaasaanye')}</h3>
          <div className="flex gap-2">
            <input value={expLabel} onChange={(e) => setExpLabel(e.target.value)} placeholder={str('What for? (e.g. transport)', 'Kiki? (e.g. entambula)')} className="flex-[2] min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
            <input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} inputMode="numeric" placeholder="UGX" className="flex-1 min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
          </div>
          <button
            type="button"
            onClick={() => {
              const amt = Math.floor(Number(expAmount) || 0);
              if (!expLabel.trim() || amt <= 0) return;
              onAddExpense(expLabel.trim(), amt);
              setExpLabel('');
              setExpAmount('');
            }}
            className="w-full min-h-[44px] bg-white border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#00261b] active:scale-[0.99]"
          >
            {str('Record expense from box cash', 'Wandiika ensaasaanya')}
          </button>
        </section>
      )}
    </main>
  );
};

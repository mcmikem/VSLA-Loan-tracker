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
    setShowAdd(!showAdd);
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
        <button type="button" onClick={() => setTab('group')} className={`flex-1 py-2 rounded-lg transition ${tab === 'group' ? 'bg-[#0b3d2e] text-white' : 'text-[#4B5563]'}`}>
          {str('Group stock', "Ebyamaguzi by'ekibiina")}
        </button>
        <button type="button" onClick={() => setTab('member')} className={`flex-1 py-2 rounded-lg transition ${tab === 'member' ? 'bg-[#0b3d2e] text-white' : 'text-[#4B5563]'}`}>
          {str('Member businesses', "Bizinesi z'abakiise")}
        </button>
      </div>

      {showAdd && (
        <section className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
          <h3 className="text-xs font-bold text-[#00261b] uppercase tracking-wider">
            {tab === 'group' ? str('Buy stock for the group', 'Gula ebintu by\'ekibiina') : str('List a member business', 'Wandiisa bizinesi')}
          </h3>
          {tab === 'group' && (
            <p className="text-[11px] text-[#4B5563]">
              {str('Cash in box:', 'Ssente mu sanduuko:')} <span className="font-mono font-bold">UGX {boxCashBalance.toLocaleString()}</span>
            </p>
          )}
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tab === 'member' && form.kind === 'service' ? str('Service (e.g. Tailoring, Bodaboda, Salon)', 'Omulembe (e.g. kutunga, bodaboda)') : str('Product name (e.g. Maize flour)', 'Erinya ly\'ekintu')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
          {tab === 'member' && (
            <>
              <div className="flex gap-2">
                {(['product', 'service'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm({ ...form, kind: k, unit: k === 'service' ? 'session' : 'pcs' })}
                    className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold border ${form.kind === k ? 'bg-[#00261b] text-white' : 'bg-white border-[#E5E7EB]'}`}
                  >
                    {k === 'product' ? str('Product', 'Ekintu') : str('Service', 'Omulembe')}
                  </button>
                ))}
              </div>
              <input value={form.sellerName} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} placeholder={str('Seller name', 'Nannyini bizinesi')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
              <input value={form.sellerPhone} onChange={(e) => setForm({ ...form, sellerPhone: e.target.value })} inputMode="tel" placeholder={str('Seller phone (buyers contact you here)', 'Namba ya ssimu')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm font-mono" />
            </>
          )}
          <div className="grid grid-cols-3 gap-2">
            <input value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} inputMode="numeric" placeholder={str('Cost', 'Omutindo')} className="min-h-[44px] border border-[#E5E7EB] rounded-lg px-2 text-sm font-mono" />
            <input value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} inputMode="numeric" placeholder={str('Price', 'Omutengo')} className="min-h-[44px] border border-[#E5E7EB] rounded-lg px-2 text-sm font-mono" />
            <input value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} inputMode="numeric" placeholder={str('Qty', 'Omuwendo')} className="min-h-[44px] border border-[#E5E7EB] rounded-lg px-2 text-sm font-mono" />
          </div>
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={str('Unit (pcs, kg, litres)', 'Kipimo')} className="w-full min-h-[44px] border border-[#E5E7EB] rounded-lg px-3 text-sm" />
          {error && <p className="text-[11px] font-bold text-[#B91C1C]">{error}</p>}
          <button type="button" onClick={submitAdd} className="w-full min-h-[48px] bg-[#006d30] text-white rounded-lg font-bold text-sm active:scale-[0.99]">
            {tab === 'group' ? str('Buy stock from box cash', 'Gula okuva mu sanduuko') : str('List business', 'Wandiisa')}
          </button>
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

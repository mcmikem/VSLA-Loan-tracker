import React, { useEffect, useState } from 'react';

export type DemoLang = 'EN' | 'LU';

const COPY: Record<DemoLang, { scenes: string[]; [k: string]: string | string[] }> = {
  EN: {
    scenes: ['Stamp shares', 'Seal the box', 'Approve loan'],
    sarah: 'Sarah N. #01',
    shareAt: 'share @ UGX 10,000',
    total: 'Total',
    stamped: 'Stamped ✓',
    expected: 'Expected in box',
    counted: 'Counted',
    balanced: 'BALANCED — seal it',
    key1: 'Key 1/2 · Grace',
    key2: 'Key 2/2 · Peter',
    handover: 'Hand phone to 2nd officer…',
    released: 'Released UGX 600,000 · Cash',
    loanFor: 'Joseph M. #02 · loan 600,000',
  },
  LU: {
    scenes: ['Teeka sitampu', 'Siba sanduuko', 'Kkiriza ekyewolo'],
    sarah: 'Sarah N. #01',
    shareAt: 'omugabo @ UGX 10,000',
    total: 'Omugatte',
    stamped: 'Kikoseddwa ✓',
    expected: 'Ezisuubirwa mu sanduuko',
    counted: 'Ezibaliddwa',
    balanced: 'BIRINA — zisibe',
    key1: 'Ekisumuluzo 1/2 · Grace',
    key2: 'Ekisumuluzo 2/2 · Peter',
    handover: 'Wa ssimu eri omukulu omulala…',
    released: 'Zifulumidwa UGX 600,000 · Nkalu',
    loanFor: 'Joseph M. #02 · kyewolo 600,000',
  },
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Animated miniature of three real Friday moments, built from the same
 * visual language as the app. Auto-plays; dots jump scenes; static when
 * the user prefers reduced motion.
 */
export const PhoneDemo: React.FC<{ lang?: DemoLang }> = ({ lang = 'EN' }) => {
  const t = COPY[lang];
  const [scene, setScene] = useState(0);
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      setTick(99);
    }
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setTick((prev) => {
        if (prev >= 5) {
          setScene((s) => (s + 1) % 3);
          return 0;
        }
        return prev + 1;
      });
    }, 950);
    return () => clearInterval(id);
  }, [reduced]);

  const go = (s: number) => {
    setScene(s);
    setTick(0);
  };

  // Scene phases (tick 0..5)
  const shares = scene === 0 ? Math.min(3, tick + 1) : 3;
  const countedFinal = scene === 1 ? (tick >= 5 ? 1420000 : Math.min(1420000, 1290000 + tick * 26000)) : 1420000;
  const keyStage = scene === 2 ? Math.min(3, tick) : 3; // 0 none,1 key1,2 handover,3 released

  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="rounded-[2rem] border-[6px] border-[#00261b] bg-[#F6F7F6] shadow-2xl overflow-hidden">
        <div className="bg-[#00261b] pt-2 pb-1 flex justify-center">
          <div className="w-20 h-1.5 rounded-full bg-white/25" />
        </div>
        <div className="p-3 min-h-[340px] space-y-2.5">
          {scene === 0 && (
            <div className="space-y-2.5 animate-[demoin_0.4s_ease-out]">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm">SN</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#00261b] truncate">{t.sarah as string}</p>
                  <p className="text-[10px] text-gray-500">{t.shareAt as string}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 border font-bold text-[#00261b]">−</span>
                  <span key={shares} className="font-mono font-bold w-4 text-center text-[#00261b] animate-[demopop_0.35s_ease-out]">{shares}</span>
                  <span className={`w-7 h-7 rounded-lg font-bold text-white ${tick < 5 ? 'bg-[#00261b] scale-110' : 'bg-[#00261b]'} transition-transform`}>+</span>
                </div>
              </div>
              <div className="bg-[#0b3d2e] text-white rounded-xl p-3 flex items-center justify-between">
                <span className="text-[11px] text-[#bcedd7]">{t.total as string}</span>
                <span key={`t-${shares}`} className="font-mono text-xl font-bold animate-[demopop_0.35s_ease-out]">UGX {fmt(shares * 10000)}</span>
              </div>
              {tick >= 2 && (
                <div className="bg-[#DCFCE7] border border-[#006d30] text-[#166534] rounded-xl p-2.5 text-xs font-bold text-center animate-[demopop_0.4s_ease-out]">
                  {t.stamped as string}
                </div>
              )}
            </div>
          )}

          {scene === 1 && (
            <div className="space-y-2.5 animate-[demoin_0.4s_ease-out]">
              <div className="bg-white rounded-xl border p-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{t.expected as string}</span>
                <span className="font-mono font-bold text-[#00261b]">UGX 1,420,000</span>
              </div>
              <div className="bg-white rounded-xl border-2 border-[#00261b] p-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{t.counted as string}</span>
                <span key={countedFinal} className="font-mono text-xl font-bold text-[#00261b]">{`UGX ${fmt(countedFinal)}`}</span>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                {[0, 1, 2].map((k) => (
                  <span
                    key={k}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300 ${
                      tick >= 2 + k ? 'bg-[#006d30] scale-110' : 'bg-gray-300'
                    }`}
                  >
                    {tick >= 2 + k ? '✓' : k + 1}
                  </span>
                ))}
              </div>
              {tick >= 5 && (
                <div className="bg-[#006d30] text-white rounded-xl p-2.5 text-xs font-bold text-center animate-[demopop_0.4s_ease-out]">
                  {t.balanced as string}
                </div>
              )}
            </div>
          )}

          {scene === 2 && (
            <div className="space-y-2.5 animate-[demoin_0.4s_ease-out]">
              <div className="bg-white rounded-xl border p-3">
                <p className="text-xs font-bold text-[#00261b]">{t.loanFor as string}</p>
                <p className="font-mono text-xl font-bold text-[#00261b] mt-0.5">UGX 600,000</p>
              </div>
              <div className={`rounded-xl p-2.5 text-xs font-bold border transition-all ${keyStage >= 1 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                {t.key1 as string} {keyStage >= 1 ? '✓' : '·'}
              </div>
              {keyStage === 2 && (
                <p className="text-[11px] text-center text-gray-500 italic animate-pulse">{t.handover as string}</p>
              )}
              <div className={`rounded-xl p-2.5 text-xs font-bold border transition-all ${keyStage >= 3 ? 'bg-[#006d30] text-white border-[#006d30]' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                {keyStage >= 3 ? (t.released as string) : `${t.key2 as string} ·`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {(t.scenes as string[]).map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => go(i)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition active:scale-95 ${
              scene === i ? 'bg-[#EAB308] text-[#00261b]' : 'bg-white/10 text-white/70 border border-white/20'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>
      <style>{`@keyframes demoin { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } @keyframes demopop { 0% { transform: scale(0.85); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }`}</style>
    </div>
  );
};

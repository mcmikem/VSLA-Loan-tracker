import React, { useEffect, useState } from 'react';
import { GroupLogo } from './GroupLogo';

interface BootSplashProps {
  logoUrl?: string;
  groupName?: string;
  minMs?: number;
}

/**
 * Branded launch screen: VSLA strongbox (or the group's own logo) while
 * the app shell boots. Fades out fast — branding, not a waiting room.
 */
export const BootSplash: React.FC<BootSplashProps> = ({
  logoUrl,
  groupName,
  minMs = 750,
}) => {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), minMs);
    const t2 = setTimeout(() => setVisible(false), minMs + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [minMs]);

  if (!visible) return null;
  return (
    <div
      className={`fixed inset-0 z-[90] bg-[#00261b] flex flex-col items-center justify-center gap-4 transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="animate-[splashpop_0.5s_ease-out]">
        <GroupLogo logoUrl={logoUrl} alt="VSLA UG" className="w-20 h-20 rounded-3xl shadow-2xl" />
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-lg leading-tight">VSLA UG</p>
        {groupName && <p className="text-[#bcedd7] text-xs font-semibold mt-0.5">{groupName}</p>}
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#EAB308] animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
      <style>{`@keyframes splashpop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
};

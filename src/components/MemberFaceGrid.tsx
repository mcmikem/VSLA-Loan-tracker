import React from 'react';
import { Member } from '../types';
import { MemberAvatar } from './MemberAvatar';

interface MemberFaceGridProps {
  members: Member[];
  value: string;
  onChange: (memberId: string) => void;
  /** row = horizontal scroll chips; grid = 4-col photo grid */
  layout?: 'row' | 'grid';
}

/**
 * Tap-the-face member picker for low-literacy users.
 * Always shows member number (numeric — no reading required to confirm).
 */
export const MemberFaceGrid: React.FC<MemberFaceGridProps> = ({
  members,
  value,
  onChange,
  layout = 'row',
}) => {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-4 gap-2">
        {members.map((m) => {
          const active = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition min-h-[76px] active:scale-95 ${
                active
                  ? 'border-[#006d30] bg-[#DCFCE7]'
                  : 'border-[#E5E7EB] bg-white'
              }`}
            >
              <MemberAvatar
                name={m.name}
                initials={m.initials}
                photoUrl={m.photoUrl}
                sizeClass="w-11 h-11 text-sm"
              />
              <span className="font-mono text-[11px] font-bold text-[#00261b]">#{m.no}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {members.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border-2 transition shrink-0 min-h-[44px] active:scale-95 ${
              active ? 'border-[#006d30] bg-[#DCFCE7]' : 'border-[#E5E7EB] bg-white'
            }`}
          >
            <MemberAvatar
              name={m.name}
              initials={m.initials}
              photoUrl={m.photoUrl}
              sizeClass="w-8 h-8 text-[11px]"
            />
            <span className="font-mono text-xs font-bold text-[#00261b]">#{m.no}</span>
          </button>
        );
      })}
    </div>
  );
};

import React from 'react';

interface MemberAvatarProps {
  name: string;
  initials?: string;
  photoUrl?: string;
  /** tailwind size classes, default md */
  sizeClass?: string;
  avatarBg?: string;
}

/** Face photo when present, initials fallback otherwise. */
export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  name,
  initials,
  photoUrl,
  sizeClass = 'w-10 h-10 text-sm',
  avatarBg = 'bg-emerald-700',
}) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-white/20 shadow-sm`}
      />
    );
  }
  const letters =
    initials || name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div
      aria-hidden
      className={`${sizeClass} rounded-full ${avatarBg} text-white flex items-center justify-center font-bold shrink-0 border border-white/20`}
    >
      {letters}
    </div>
  );
};

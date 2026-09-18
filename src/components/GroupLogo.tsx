import React from 'react';

interface GroupLogoProps {
  logoUrl?: string;
  alt?: string;
  className?: string;
}

/**
 * Brand mark: the group's own logo when set in Settings,
 * otherwise the VSLA strongbox. One component so a group logo
 * replaces VSLA branding consistently everywhere in the app.
 */
export const GroupLogo: React.FC<GroupLogoProps> = ({
  logoUrl,
  alt = 'Group logo',
  className = 'w-8 h-8 rounded-lg',
}) => {
  return (
    <img
      src={logoUrl || '/icon.svg'}
      alt={alt}
      className={`${className} object-cover shrink-0`}
    />
  );
};

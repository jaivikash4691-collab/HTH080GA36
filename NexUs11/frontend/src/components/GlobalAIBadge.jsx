import React from 'react';
import { BADGE_TYPES } from '../constants/colorTokens';

export const GlobalAIBadge = ({ type = 'EVIDENCE_BACKED', className = '', size = 'md' }) => {
  const badgeConfig = BADGE_TYPES[type] || BADGE_TYPES.EVIDENCE_BACKED;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all ${sizeClasses} ${className}`}
      style={{
        backgroundColor: badgeConfig.bgColor,
        color: badgeConfig.color,
        borderColor: badgeConfig.borderColor,
      }}
      title={badgeConfig.description}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: badgeConfig.color }}
      />
      {badgeConfig.label}
    </span>
  );
};

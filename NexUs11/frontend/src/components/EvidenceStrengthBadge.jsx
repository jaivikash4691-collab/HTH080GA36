import React from 'react';
import { EVIDENCE_STRENGTH } from '../constants/colorTokens';

export const EvidenceStrengthBadge = ({ strength = 'SUPPORTED', size = 'sm', className = '' }) => {
  const config = EVIDENCE_STRENGTH[strength] || EVIDENCE_STRENGTH.SUPPORTED;

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-2 py-0.5 font-bold tracking-wider'
    : 'text-xs px-2.5 py-1 font-bold tracking-wider';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border uppercase select-none transition-all ${sizeClasses} ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.badgeColor,
        borderColor: config.borderColor,
      }}
      title={config.description}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.badgeColor }}
      />
      {config.label}
    </span>
  );
};

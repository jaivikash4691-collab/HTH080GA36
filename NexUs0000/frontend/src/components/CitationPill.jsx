import React from 'react';
import { BookOpen } from 'lucide-react';

export const CitationPill = ({ id, label, className = '' }) => {
  const displayLabel = label || id;
  if (!displayLabel) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300 bg-slate-100 dark:bg-slate-800 ${className}`}
      title="Source paper reference"
    >
      <BookOpen className="w-3 h-3 text-[#64748B] dark:text-slate-400" />
      <span>{displayLabel}</span>
    </span>
  );
};

export default CitationPill;

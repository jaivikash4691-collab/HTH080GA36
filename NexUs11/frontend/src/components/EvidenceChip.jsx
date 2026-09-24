import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { FileText } from 'lucide-react';

export const EvidenceChip = ({ id, label, className = '' }) => {
  const { openEvidence } = useResearch();

  const displayLabel = label || id;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openEvidence(id || displayLabel);
      }}
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#1E1B4B]/30 text-[#1E1B4B] bg-white hover:bg-[#1E1B4B] hover:text-white transition-all cursor-pointer shadow-xs active:scale-95 ${className}`}
      title="Click to view verified source evidence"
    >
      <FileText className="w-3.5 h-3.5 opacity-70" />
      <span>[{displayLabel}]</span>
    </button>
  );
};

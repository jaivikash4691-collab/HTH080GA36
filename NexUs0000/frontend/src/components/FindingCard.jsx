import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Check, ArrowRight } from 'lucide-react';
import { CitationPill } from './CitationPill';
import { GlobalAIBadge } from './GlobalAIBadge';

export const FindingCard = ({ finding }) => {

  return (
    <div className="glass-card overflow-hidden border-t-4 border-t-[#0D9488] p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0D9488]">
            <span className="w-4 h-4 rounded-full bg-[#0D9488]/15 flex items-center justify-center">
              <Check className="w-3 h-3 text-[#0D9488]" />
            </span>
            COMMON FINDING
          </span>
          <GlobalAIBadge type="PAPER_GROUNDED" size="sm" />
        </div>

        <h3 className="text-base font-bold text-[#0F172A] leading-snug">
          {finding.title}
        </h3>

        <p className="text-sm text-[#0F172A] leading-relaxed">
          {finding.statement}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#64748B]">Supported by {finding.supportedRatio}</span>
          <span className="text-[#0D9488]">{finding.coveragePercent}% Coverage</span>
        </div>

        {/* Paper Coverage Bar (Teal fill) */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${finding.coveragePercent}%`,
              backgroundColor: '#0D9488',
            }}
          />
        </div>

        {/* Paper Citation Reference Chips */}
        {finding.evidenceIds && finding.evidenceIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {finding.evidenceIds.map((eid) => (
              <CitationPill key={eid} id={eid} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

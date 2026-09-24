import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Sparkles, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { CitationPill } from './CitationPill';
import { GlobalAIBadge } from './GlobalAIBadge';

export const GapCard = ({ gap, variant = 'author' }) => {

  const isAi = variant === 'ai' || gap.type === 'ai';

  return (
    <div
      className={`glass-card overflow-hidden border-t-4 border-t-[#D97706] p-6 space-y-4 transition-all ${
        isAi
          ? 'border-dashed border-2 border-[#D97706]/60 bg-amber-50/20'
          : 'border-solid border-[#E2E8F0]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAi ? (
            <div className="w-7 h-7 rounded-lg border border-[#D97706] text-[#D97706] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#D97706] text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
            {isAi ? 'AI-Synthesized Gap' : 'Author-Identified Gap'}
          </span>
        </div>

        {isAi ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#D97706] text-[#D97706] bg-[#D97706]/10">
            <AlertCircle className="w-3.5 h-3.5" />
            ⚠ AI-Synthesized
          </span>
        ) : (
          <GlobalAIBadge type="PAPER_GROUNDED" size="sm" />
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-base font-bold text-[#0F172A] leading-snug">
          {gap.title}
        </h3>
        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
          {gap.description}
        </p>
      </div>

      {/* Author metadata or AI Synthesis metadata */}
      {isAi ? (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B] font-medium">Literature Coverage</span>
            <span className="font-bold text-[#D97706]">{gap.literatureCoverage || gap.evidenceCoverage || 'High'}</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${gap.coveragePercent || 80}%`,
                backgroundColor: '#D97706',
              }}
            />
          </div>

          <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#0F172A]">
            <span className="font-bold text-[#D97706] block mb-0.5">Cross-Literature Synthesis:</span>
            {gap.rationale}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-medium text-[#64748B]">Supporting Papers:</span>
            {gap.evidenceIds?.map((eid) => (
              <CitationPill key={eid} id={eid} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#0F172A] block">{gap.sourcePaper}</span>
              <span className="text-[#64748B]">{gap.section} • Page {gap.page}</span>
            </div>
            {gap.evidenceId && (
              <CitationPill id={gap.evidenceId} label={`${gap.paperCode} • p${gap.page}`} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

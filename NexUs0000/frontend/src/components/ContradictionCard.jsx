import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { AlertCircle, ArrowRightLeft, Sparkles, Check } from 'lucide-react';
import { CitationPill } from './CitationPill';
import { GlobalAIBadge } from './GlobalAIBadge';

export const ContradictionCard = ({ contradiction }) => {
  const { openPaperProfile, papers } = useResearch();

  const paperA = papers.find((p) => p.code === contradiction.paperA.code || p.id === contradiction.paperA.id);
  const paperB = papers.find((p) => p.code === contradiction.paperB.code || p.id === contradiction.paperB.id);

  return (
    <div className="glass-card overflow-hidden border-t-4 border-t-[#E11D48] p-6 space-y-6">
      {/* Category header */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E11D48]">
          <AlertCircle className="w-4 h-4 text-[#E11D48]" />
          {contradiction.category}
        </span>
        <span className="text-xs font-semibold text-[#64748B]">
          Cross-Study Discrepancy
        </span>
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#0F172A]">
          {contradiction.title}
        </h3>
      </div>

      {/* VS Comparison Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
        {/* Paper A */}
        <div 
          onClick={() => paperA && openPaperProfile(paperA)}
          className="p-4 rounded-lg bg-white border border-[#E2E8F0] space-y-2 cursor-pointer hover:border-[#1E1B4B]/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1E1B4B] bg-[#1E1B4B]/10 px-2 py-0.5 rounded">
              {contradiction.paperA.code}
            </span>
            <span className="text-xs text-[#64748B]">{contradiction.paperA.method}</span>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">
            {contradiction.paperA.metricValue}
          </div>
          <div className="text-xs text-[#64748B] font-medium">
            {contradiction.paperA.metricLabel} ({contradiction.paperA.dataset})
          </div>
        </div>

        {/* Central VS Badge (subtle crimson pulse) */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-8 h-8 rounded-full bg-[#E11D48] text-white flex items-center justify-center font-black text-xs shadow-md glow-crimson-pulse border-2 border-white">
            VS
          </div>
        </div>

        {/* Paper B */}
        <div 
          onClick={() => paperB && openPaperProfile(paperB)}
          className="p-4 rounded-lg bg-white border border-[#E2E8F0] space-y-2 cursor-pointer hover:border-[#1E1B4B]/30 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1E1B4B] bg-[#1E1B4B]/10 px-2 py-0.5 rounded">
              {contradiction.paperB.code}
            </span>
            <span className="text-xs text-[#64748B]">{contradiction.paperB.method}</span>
          </div>
          <div className="text-2xl font-black text-[#E11D48]">
            {contradiction.paperB.metricValue}
          </div>
          <div className="text-xs text-[#64748B] font-medium">
            {contradiction.paperB.metricLabel} ({contradiction.paperB.dataset})
          </div>
        </div>
      </div>

      {/* Possible Contributing Differences */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
          Possible contributing differences
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {contradiction.differences.map((diff) => (
            <div
              key={diff.name}
              className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
            >
              <div className="font-semibold text-[#0F172A] flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#E11D48]" />
                <span>{diff.name}</span>
              </div>
              <div className="text-[11px] text-[#64748B] mt-1 line-clamp-1" title={diff.note}>
                {diff.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Potential Explanation (AI inference pill - Section 13) */}
      <div className="p-3.5 rounded-xl bg-[#4F46E5]/5 border border-[#4F46E5]/20 space-y-1.5">
        <div className="flex items-center gap-2">
          <GlobalAIBadge type="AI_SYNTHESIS" size="sm" />
          <span className="text-xs font-semibold text-[#4F46E5]">
            Potential explanation — AI inference
          </span>
        </div>
        <p className="text-xs text-[#0F172A] leading-relaxed">
          {contradiction.aiExplanation}
        </p>
      </div>

      {/* Action and Citations */}
      <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B]">Citations:</span>
          {contradiction.evidenceIds?.map((eid) => (
            <CitationPill key={eid} id={eid} />
          ))}
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-[#E11D48] border border-rose-200">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Cross-Study Discrepancy</span>
        </span>
      </div>
    </div>
  );
};

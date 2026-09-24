import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Lightbulb, ArrowDown, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { GlobalAIBadge } from './GlobalAIBadge';
import { EvidenceChip } from './EvidenceChip';

export const ResearchDirectionCard = () => {
  const { strategy } = useResearch();

  return (
    <div className="glass-card p-8 space-y-8 animate-fade-in-up">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-[#D97706]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Potential Research Direction
            </h2>
            <p className="text-xs text-[#64748B]">Synthesized from gaps, cross-study contradictions, and clinical needs</p>
          </div>
        </div>
        <GlobalAIBadge type="PROPOSED_DIRECTION" />
      </div>

      {/* Animated Vertical Flow: Gaps -> Evidence -> Direction */}
      <div className="space-y-6 relative max-w-3xl mx-auto">
        {/* Step 1: Identified Gaps */}
        <div className="p-5 rounded-2xl bg-[#D97706]/5 border-2 border-dashed border-[#D97706]/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
              Stage 1: Synthesized Literature Gaps
            </span>
            <span className="text-xs font-semibold text-[#D97706] bg-amber-100/50 px-2 py-0.5 rounded">
              3 Primary Gaps
            </span>
          </div>
          <ul className="space-y-2 text-xs text-[#0F172A]">
            {strategy.identifiedGaps.map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Downward Connector Line */}
        <div className="flex flex-col items-center justify-center my-1">
          <div className="w-0.5 h-6 bg-[#E2E8F0]" />
          <div className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[#64748B]">
            <ArrowDown className="w-4 h-4" />
          </div>
          <div className="w-0.5 h-6 bg-[#E2E8F0]" />
        </div>

        {/* Step 2: Grounding Evidence */}
        <div className="p-5 rounded-2xl bg-[#0D9488]/5 border border-[#0D9488]/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
              Stage 2: Audited Empirical Evidence
            </span>
            <GlobalAIBadge type="EVIDENCE_BACKED" size="sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {strategy.evidencePoints.map((ev, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-[#E2E8F0] text-xs space-y-1">
                <EvidenceChip label={ev.code} id={ev.code.split(' ')[0]} />
                <p className="text-[11px] text-[#64748B] pt-1">{ev.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Downward Connector Line */}
        <div className="flex flex-col items-center justify-center my-1">
          <div className="w-0.5 h-6 bg-[#E2E8F0]" />
          <div className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[#64748B]">
            <ArrowDown className="w-4 h-4" />
          </div>
          <div className="w-0.5 h-6 bg-[#E2E8F0]" />
        </div>

        {/* Step 3: Possible Research Direction */}
        <div className="p-6 rounded-2xl bg-white border-2 border-[#1E1B4B] shadow-md space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] block mb-1">
              Stage 3: Proposed Next-Frontier Direction
            </span>
            <h3 className="text-lg font-black text-[#0F172A] leading-snug">
              {strategy.proposedDirection}
            </h3>
          </div>

          {/* Why this direction? */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] block">
              Why this direction?
            </span>
            <div className="space-y-1.5 text-xs text-[#0F172A]">
              {strategy.whyThisDirection.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI-Generated Research Direction Banner (Amber tone - Section 16 & 17) */}
          <div className="p-4 rounded-xl bg-[#D97706]/10 border border-[#D97706]/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] block">
                ⚠ AI-GENERATED RESEARCH DIRECTION
              </span>
              <p className="text-xs text-[#0F172A] mt-0.5">
                {strategy.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Lightbulb, ArrowDown, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';

export const ResearchDirectionCard = () => {
  const { strategy, papers } = useResearch();

  const gapsList = strategy?.identifiedGaps || [
    'Cross-dataset generalization under domain shift',
    'Real-time edge runtime latency and memory footprint constraints',
    'Standardized benchmarking across conflicting baseline metrics',
  ];

  const reasonsList = strategy?.whyThisDirection || [
    'Addresses verified limitations documented across uploaded papers',
    'Bridges methodology gap between monolithic and decoupled architectures',
    'Enables reproducible empirical evaluation under controlled workloads',
  ];

  return (
    <div className="glass-card p-8 space-y-8 animate-fade-in-up bg-white rounded-2xl border border-[#E2E8F0]">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Suggested Research Direction
            </h2>
            <p className="text-xs text-[#64748B]">Synthesized from limitations, cross-study differences, and technological trade-offs</p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
          Suggested Direction
        </span>
      </div>

      {/* Vertical Flow: Gaps -> Methodological Synthesis -> Proposed Strategy */}
      <div className="space-y-6 relative max-w-3xl mx-auto">
        {/* Step 1: Identified Gaps */}
        <div className="p-5 rounded-2xl bg-[#D97706]/5 border-2 border-dashed border-[#D97706]/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
              Stage 1: Synthesized Literature Gaps
            </span>
            <span className="text-xs font-semibold text-[#D97706] bg-amber-100/50 px-2 py-0.5 rounded">
              {gapsList.length} Primary Gaps
            </span>
          </div>
          <ul className="space-y-2 text-xs text-[#0F172A]">
            {gapsList.map((gap, idx) => (
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

        {/* Step 2: Proposed Research Strategy */}
        <div className="p-6 rounded-2xl bg-white border-2 border-[#1E1B4B] shadow-md space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] block mb-1">
              Stage 2: Proposed Next-Frontier Investigation
            </span>
            <h3 className="text-lg font-black text-[#0F172A] leading-snug">
              {strategy?.proposedDirection || 'Unified Scalable Evaluation Framework for Cross-Paper Methodologies'}
            </h3>
          </div>

          {/* Rationale */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] block">
              Rationale & Impact
            </span>
            <div className="space-y-1.5 text-xs text-[#0F172A]">
              {reasonsList.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI-Generated Research Direction Disclaimer */}
          <div className="p-4 rounded-xl bg-[#D97706]/10 border border-[#D97706]/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] block">
                Suggested Research Direction
              </span>
              <p className="text-xs text-[#0F172A] mt-0.5">
                This is a synthesized research direction based on reviewed limitations and opportunities. It is intended as an exploratory proposal rather than an established empirical claim.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchDirectionCard;

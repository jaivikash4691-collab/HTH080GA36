import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { GitCommit, ArrowDown, ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';
import { EvidenceStrengthBadge } from './EvidenceStrengthBadge';

export const ResearchIdeaLineageView = () => {
  const { researchIdeaLineage = [], openEvidence, openPaperProfile, papers } = useResearch();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const lineageList = researchIdeaLineage || [];

  if (lineageList.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0D9488] mx-auto flex items-center justify-center">
          <GitCommit className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Lineage Audit Trail Available</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload and analyze research papers to trace proposed research directions backward through their exact peer-reviewed genesis.
        </p>
      </div>
    );
  }

  const activeStep = lineageList[activeStepIndex] || lineageList[0];

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full">
            Zero-Hallucination Audit Trail
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Research Idea Lineage
          </h3>
          <p className="text-xs text-[#64748B]">
            Trace any proposed research direction backward through its exact peer-reviewed genesis.
          </p>
        </div>

        <EvidenceStrengthBadge strength="SUPPORTED" size="sm" />
      </div>

      {/* Interactive Lineage Stepper Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Stepper */}
        <div className="lg:col-span-7 space-y-2">
          {lineageList.map((item, idx) => {
            const isSelected = activeStepIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#1E1B4B] text-white border-[#1E1B4B] shadow-sm scale-101'
                    : 'bg-[#FBF9F5] text-[#1E1B4B] border-[#E2E8F0] hover:bg-white hover:border-[#1E1B4B]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-white text-[#1E1B4B]' : 'bg-[#1E1B4B] text-white'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        isSelected ? 'text-slate-300' : 'text-[#64748B]'
                      }`}
                    >
                      {item.step}
                    </span>
                    <span className="text-xs font-bold truncate block max-w-xs sm:max-w-md">
                      {item.label}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-semibold opacity-70">
                  Step 0{idx + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Step Context Detail Box */}
        {activeStep && (
          <div className="lg:col-span-5 bg-[#FBF9F5] rounded-2xl border border-[#E2E8F0] p-6 space-y-4 shadow-xs sticky top-24">
            <div className="border-b border-[#E2E8F0] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                {activeStep.step}
              </span>
              <h4 className="text-base font-black text-[#1E1B4B] mt-2">
                {activeStep.label}
              </h4>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
                Audited Lineage Metadata
              </span>
              <p className="text-xs text-[#0F172A] leading-relaxed bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
                {activeStep.detail}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (papers.length > 0) {
                    openPaperProfile(papers[0]);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#1E1B4B] text-white font-bold text-xs hover:bg-[#1E1B4B]/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                <span>Verify Ground Truth Evidence</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

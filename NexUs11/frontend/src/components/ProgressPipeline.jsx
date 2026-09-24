import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Check, CheckCircle2, Sparkles, Layers, ArrowRight } from 'lucide-react';

export const ProgressPipeline = ({ onCompleteAction, onViewAnalyzedPaper }) => {
  const { pipelineSteps, activeAnalysisStep, analysisStatus, papers } = useResearch();
  const [isHovered, setIsHovered] = useState(false);

  const isComplete = analysisStatus === 'completed' && activeAnalysisStep === pipelineSteps.length - 1;

  return (
    <div className="w-full max-w-2xl mx-auto glass-card p-8 space-y-8 animate-fade-in-up">
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] bg-[#4F46E5]/10 px-3 py-1 rounded-full">
          AI Research Analyzer & Synthesis Pipeline
        </span>
        <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
          {isComplete ? 'Analysis Complete' : 'ANALYZING YOUR LITERATURE'}
        </h2>
        <p className="text-xs text-[#64748B]">
          {isComplete
            ? `${papers.length} Research Papers Successfully Analyzed`
            : 'Extracting semantic nodes, methodology matrices, and empirical claims'}
        </p>
      </div>

      {/* Step by Step List */}
      <div className="space-y-4">
        {pipelineSteps.map((step, index) => {
          const isDone = index < activeAnalysisStep || isComplete;
          const isActive = index === activeAnalysisStep && !isComplete;
          const isPending = index > activeAnalysisStep && !isComplete;

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                isDone
                  ? 'border-[#0D9488]/30 bg-[#0D9488]/5 text-[#0F172A]'
                  : isActive
                  ? 'border-[#1E1B4B] bg-[#1E1B4B]/5 shadow-xs'
                  : 'border-[#E2E8F0] opacity-50 text-[#CBD5E1]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* Step indicator */}
                {isDone ? (
                  <div className="w-6 h-6 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : isActive ? (
                  <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                    <span className="absolute w-5 h-5 rounded-full bg-[#1E1B4B]/20 animate-ping" />
                    <span className="w-3 h-3 rounded-full bg-[#1E1B4B]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-[#CBD5E1] text-[#CBD5E1] flex items-center justify-center text-xs shrink-0 font-medium">
                    {index + 1}
                  </div>
                )}

                <div>
                  <div className="text-sm font-bold leading-tight">
                    {step.title}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div>
                {isDone && (
                  <span className="text-xs font-semibold text-[#0D9488]">Completed</span>
                )}
                {isActive && (
                  <span className="text-xs font-bold text-[#1E1B4B] animate-pulse">Processing...</span>
                )}
                {isPending && (
                  <span className="text-xs text-[#CBD5E1]">Queued</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* When completed: Summary Checklist & View Our Analyzed Paper Button (Req 49, 50) */}
      {isComplete && (
        <div className="space-y-6 pt-6 border-t border-[#E2E8F0] animate-fade-in-up text-center">
          <div className="relative inline-flex items-center justify-center mb-1">
            <div className="w-14 h-14 rounded-full bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#0D9488]" />
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-[#334155] font-semibold max-w-sm mx-auto text-left bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-[#0D9488]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Papers processed & structured</span>
            </div>
            <div className="flex items-center gap-2 text-[#0D9488]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Methodologies & technologies compared</span>
            </div>
            <div className="flex items-center gap-2 text-[#0D9488]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Common findings synthesized</span>
            </div>
            <div className="flex items-center gap-2 text-[#0D9488]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Research gaps & directions identified</span>
            </div>
            <div className="flex items-center gap-2 text-[#0D9488]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Research strategy generated</span>
            </div>
          </div>

          {/* Primary View Our Analyzed Paper CTA Button with Hover Effect (Req 49, 50) */}
          <div className="pt-2">
            <button
              type="button"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={onViewAnalyzedPaper || onCompleteAction}
              className="w-full py-4 px-6 rounded-2xl bg-[#0F172A] text-white font-black text-sm tracking-wide transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl hover:border-slate-400 border border-transparent flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 shadow-md"
            >
              {isHovered ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>✦ View Our Analyzed Paper →</span>
                </>
              ) : (
                <span>View Our Analyzed Paper</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressPipeline;

import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Check, CheckCircle2, Sparkles, Layers, ArrowRight } from 'lucide-react';

export const ProgressPipeline = ({ onCompleteAction }) => {
  const { pipelineSteps, activeAnalysisStep, analysisStatus, papers } = useResearch();

  const isComplete = analysisStatus === 'completed' && activeAnalysisStep === pipelineSteps.length - 1;

  return (
    <div className="w-full max-w-2xl mx-auto glass-card p-8 space-y-8 animate-fade-in-up">
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] bg-[#4F46E5]/10 px-3 py-1 rounded-full">
          Cross-Document Synthesis Engine
        </span>
        <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
          {isComplete ? 'Analysis Complete' : 'ANALYZING YOUR LITERATURE'}
        </h2>
        <p className="text-xs text-[#64748B]">
          {isComplete
            ? 'Grounding verification & meta-synthesis indexed successfully'
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

      {/* When completed: Stats & Glow Button */}
      {isComplete && (
        <div className="space-y-6 pt-4 border-t border-[#E2E8F0] animate-fade-in-up text-center">
          <div className="relative inline-flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center glow-teal-pulse">
              <CheckCircle2 className="w-10 h-10 text-[#0D9488]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="text-xl font-black text-[#0F172A]">{papers.length}</div>
              <div className="text-xs text-[#64748B] font-medium">Papers Analyzed</div>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="text-xl font-black text-[#0F172A]">42</div>
              <div className="text-xs text-[#64748B] font-medium">Sections Identified</div>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="text-xl font-black text-[#0F172A]">386</div>
              <div className="text-xs text-[#64748B] font-medium">Evidence Chunks</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCompleteAction}
            className="w-full py-3.5 px-6 rounded-xl bg-[#1E1B4B] text-white font-bold text-sm hover:bg-[#1E1B4B]/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>View Research Landscape</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

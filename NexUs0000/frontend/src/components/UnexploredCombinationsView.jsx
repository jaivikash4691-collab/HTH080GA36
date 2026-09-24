import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Sparkles, AlertCircle, Layers, ArrowRight, Lightbulb } from 'lucide-react';

export const UnexploredCombinationsView = () => {
  const { unexploredCombinations = [] } = useResearch();

  const combinationsList = unexploredCombinations || [];

  if (combinationsList.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D97706] mx-auto flex items-center justify-center">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Unexplored Combinations Detected</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload 2 or more research papers to identify untested intersections of proven architectures and orthogonal datasets.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-full">
            Novelty Discovery Engine
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            "What Nobody Combined?" Detector
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Identifying potential high-impact combinations of proven architectures and orthogonal datasets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {combinationsList.map((item) => (
          <div
            key={item.id}
            className="nexus-hover-card p-6 rounded-2xl border-2 border-dashed border-[#2563EB]/40 space-y-4 bg-blue-50/15"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-100/60 px-2.5 py-0.5 rounded-md">
                POTENTIAL UNEXPLORED COMBINATION
              </span>
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
            </div>

            <h4 className="text-base font-black text-[#1E1B4B] leading-snug">
              {item.combination}
            </h4>

            <p className="text-xs text-[#0F172A] leading-relaxed">
              {item.rationale}
            </p>

            <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs">
              <span className="font-bold text-[#0D9488] block mb-0.5">Potential Hypothesis Benefit:</span>
              <span className="text-[#64748B]">{item.potentialBenefit}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-100 text-[11px] text-[#64748B] italic flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{item.disclaimer}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

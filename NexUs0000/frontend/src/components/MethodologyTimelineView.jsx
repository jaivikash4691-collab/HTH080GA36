import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Calendar, ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export const MethodologyTimelineView = () => {
  const { methodologyTimeline = [], openPaperProfile, papers } = useResearch();

  const timelineList = methodologyTimeline || [];
  const [selectedYear, setSelectedYear] = useState(timelineList[0]?.year);

  if (timelineList.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0D9488] mx-auto flex items-center justify-center">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Methodology Timeline Available</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload and analyze research papers to generate an algorithmic evolution timeline and milestone progression.
        </p>
      </div>
    );
  }

  const selectedEntry = timelineList.find((item) => item.year === selectedYear) || timelineList[0];

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full">
            Chronological Evolution
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Methodology Evolution Timeline
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Click timeline milestones to inspect algorithmic progression across analyzed literature.
          </p>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Strip */}
      <div className="relative py-6 overflow-x-auto">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-[#E2E8F0] z-0" />

        <div className="flex items-center justify-between gap-4 min-w-[500px] relative z-10 px-4">
          {timelineList.map((item) => {
            const isSelected = selectedEntry?.year === item.year;

            return (
              <button
                key={item.year}
                type="button"
                onClick={() => setSelectedYear(item.year)}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all cursor-pointer ${
                  isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-all shadow-sm ${
                    isSelected
                      ? 'bg-[#1E1B4B] text-white ring-4 ring-[#1E1B4B]/15 scale-110'
                      : 'bg-white border-2 border-[#CBD5E1] text-[#1E1B4B] hover:border-[#1E1B4B]'
                  }`}
                >
                  {item.year}
                </div>
                <span className="text-xs font-bold text-[#1E1B4B] max-w-[120px] text-center leading-tight truncate">
                  {(item.method || 'Method').split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Milestone Detail Box */}
      {selectedEntry && (
        <div className="p-6 rounded-2xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black text-[#2563EB] bg-blue-50 px-3 py-1 rounded-lg">
                {selectedEntry.year} Milestone
              </span>
              <h4 className="text-base font-bold text-[#1E1B4B]">
                {selectedEntry.title}
              </h4>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">
              {selectedEntry.method}
            </span>
          </div>

          <p className="text-xs text-[#0F172A] leading-relaxed">
            {selectedEntry.breakthrough}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-[#E2E8F0]/60">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#64748B]">Associated Literature:</span>
              {(selectedEntry.papers || []).map((p, idx) => (
                <span key={idx} className="font-bold text-[#1E1B4B] bg-white px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
                  {p}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const matched = papers.find((p) =>
                  (selectedEntry.papers || []).some((sp) => sp.includes(p.code) || p.title.includes(sp))
                );
                if (matched) openPaperProfile(matched);
                else if (papers.length > 0) openPaperProfile(papers[0]);
              }}
              className="text-xs font-bold text-[#1E1B4B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Methodology Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

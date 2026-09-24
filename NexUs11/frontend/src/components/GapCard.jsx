import React from 'react';
import { Sparkles, UserCheck, AlertCircle } from 'lucide-react';

export const GapCard = ({ gap, variant = 'author' }) => {
  const isAi = variant === 'ai' || gap.type === 'ai';

  return (
    <div
      className={`glass-card overflow-hidden border-t-4 border-t-[#D97706] p-6 space-y-4 transition-all rounded-2xl ${
        isAi
          ? 'border-dashed border-2 border-[#D97706]/60 bg-amber-50/20'
          : 'border-solid border-[#E2E8F0] bg-white'
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
            {isAi ? 'Synthesized Research Gap' : 'Documented Limitation'}
          </span>
        </div>

        {isAi ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#D97706] text-[#D97706] bg-[#D97706]/10">
            <AlertCircle className="w-3.5 h-3.5" />
            Literature Blindspot
          </span>
        ) : (
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
            Documented
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div>
        <h3 className="text-base font-bold text-[#0F172A] leading-snug">
          {gap.title}
        </h3>
        <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
          {gap.description}
        </p>
      </div>

      {/* Details */}
      {isAi ? (
        <div className="space-y-2.5 pt-2">
          <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#0F172A]">
            <span className="font-bold text-[#D97706] block mb-0.5">Literature Synthesis:</span>
            {gap.rationale || gap.whyItMatters || 'Cross-paper comparison highlights unverified generalization.'}
          </div>

          {gap.papersCovering && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[#64748B] font-medium">Addressed Scope:</span>
              <span className="font-bold text-[#1E1B4B]">{gap.papersCovering.join(', ')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#0F172A] block">{gap.sourcePaper || 'Source Literature'}</span>
              <span className="text-[#64748B]">{gap.section || 'Limitations Section'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GapCard;

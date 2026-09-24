import React from 'react';
import { ComparisonTable } from '../components/ComparisonTable';
import { useResearch } from '../context/ResearchContext';
import { Table2, ArrowRight, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { GlobalAIBadge } from '../components/GlobalAIBadge';

export const ComparisonPage = ({ onNavigate }) => {
  const { papers } = useResearch();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] bg-[#1E1B4B]/10 px-2.5 py-0.5 rounded-full">
            Stage 04 • Cross-Document Matrix
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight mt-1.5">
            Paper Comparison Matrix
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Side-by-side methodology, sample size, evaluation metric, and limitation audit across all {papers.length} studies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('findings')}
            className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0D9488]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Common Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1E1B4B]" />
          <span>Tip: The first column is locked (sticky) for easy horizontal scrolling. <strong>Click any row</strong> to open its full paper profile with verbatim evidence.</span>
        </div>
        <GlobalAIBadge type="EVIDENCE_BACKED" size="sm" />
      </div>

      {/* Comparison Matrix Table */}
      <ComparisonTable />
    </div>
  );
};

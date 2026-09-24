import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { FindingCard } from '../components/FindingCard';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { GlobalAIBadge } from '../components/GlobalAIBadge';

export const FindingsPage = ({ onNavigate }) => {
  const { findings, papers } = useResearch();

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
              Consensus Analysis • Sea Glass Teal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            What do the papers agree on?
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Empirical consensus claims supported across multiple peer-reviewed studies with verified ground-truth citations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlobalAIBadge type="EVIDENCE_BACKED" />
          <button
            type="button"
            onClick={() => onNavigate('contradictions')}
            className="px-4 py-2 rounded-xl bg-[#E11D48] text-white text-xs font-bold hover:bg-[#E11D48]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Contradictions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid or Empty State */}
      {findings.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1B4B]">No consensus findings discovered yet</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {papers.length === 0
              ? 'Upload research papers and run multi-paper analysis to reveal common findings across studies.'
              : 'Execute multi-paper analysis to synthesize cross-document findings.'}
          </p>
          {papers.length === 0 && (
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#2A2663] transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Upload Papers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FindingsPage;

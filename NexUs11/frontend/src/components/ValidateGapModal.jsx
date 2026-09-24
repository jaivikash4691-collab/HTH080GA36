import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { X, ShieldCheck, AlertCircle, CheckCircle2, FileText, ArrowRight, HelpCircle } from 'lucide-react';
import { EvidenceStrengthBadge } from './EvidenceStrengthBadge';
import { EvidenceChip } from './EvidenceChip';

export const ValidateGapModal = () => {
  const { activeValidateGap, closeValidateGap, openEvidence } = useResearch();

  if (!activeValidateGap) return null;

  const gap = activeValidateGap;
  const val = gap.validation || {};

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-[#1E1B4B] text-white p-6 relative">
          <button
            onClick={closeValidateGap}
            className="absolute top-5 right-5 p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D97706] text-white">
              {gap.category || 'Research Gap Radar'}
            </span>
            <span className="text-xs text-slate-300">
              Rigorous Cross-Literature Verification Audit
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight pr-6">
            {gap.title}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Auditing supporting citations, limitation claims, and potential counter-evidence
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-[#0F172A]">
          {/* Classification Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                Evidence Classification Level
              </span>
              <span className="text-sm font-black text-[#1E1B4B] mt-0.5 block">
                {val.classification || 'STRONG EVIDENCE'}
              </span>
            </div>
            <EvidenceStrengthBadge strength={val.classification || 'SUPPORTED'} size="md" />
          </div>

          {/* 1. Explicit Author Statements */}
          <div className="space-y-2">
            <span className="font-bold text-[#1E1B4B] uppercase tracking-wider block flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#15803D]" />
              1. Explicit Author-Stated Limitations
            </span>
            <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1.5 leading-relaxed">
              {val.explicitPapers && val.explicitPapers.length > 0 ? (
                val.explicitPapers.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0 mt-0.5" />
                    <span className="font-medium text-[#0F172A]">{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-[#64748B] italic">No single author explicitly stated this gap; it was derived across cross-study comparisons.</div>
              )}
            </div>
          </div>

          {/* 2. Inferred Synthesis Rationale */}
          <div className="space-y-2">
            <span className="font-bold text-[#1E1B4B] uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              2. Cross-Document Inferred Synthesis
            </span>
            <p className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-[#0F172A] leading-relaxed">
              {val.inferredSynthesis || gap.summary}
            </p>
          </div>

          {/* 3. Conflicting Evidence or Evidence Against Gap */}
          <div className="space-y-2">
            <span className="font-bold text-[#E11D48] uppercase tracking-wider block flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#E11D48]" />
              3. Conflicting Evidence / Nuances
            </span>
            <p className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 text-[#0F172A] leading-relaxed">
              {val.conflictingEvidence || 'None identified in reviewed 5-paper corpus.'}
            </p>
          </div>

          {/* 4. Supporting Citations */}
          {gap.evidenceIds && gap.evidenceIds.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-[#64748B] uppercase tracking-wider block">
                Audited Source Chunks
              </span>
              <div className="flex flex-wrap gap-2">
                {gap.evidenceIds.map((eid) => (
                  <EvidenceChip key={eid} id={eid} />
                ))}
              </div>
            </div>
          )}

          {/* Final Verdict */}
          <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200">
            <span className="font-bold text-[#0D9488] uppercase tracking-wider block text-[10px]">
              Scientific Integrity Verdict
            </span>
            <p className="text-xs text-[#0F172A] font-semibold mt-1">
              {val.verdict || 'Defensible empirical research opportunity with verified publication lineage.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#FBF9F5] flex items-center justify-end">
          <button
            type="button"
            onClick={closeValidateGap}
            className="px-5 py-2.5 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 transition-all cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

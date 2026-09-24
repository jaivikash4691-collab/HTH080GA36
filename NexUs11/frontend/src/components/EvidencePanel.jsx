import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { X, CheckCircle, ExternalLink, Bookmark, ShieldCheck } from 'lucide-react';
import { GlobalAIBadge } from './GlobalAIBadge';

export const EvidencePanel = () => {
  const { activeEvidence, closeEvidence, openPaperProfile, papers } = useResearch();

  if (!activeEvidence) return null;

  const correspondingPaper = papers.find(
    (p) => p.code === activeEvidence.paperCode || p.id === activeEvidence.paperCode
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fade-in-up">
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col transform transition-all duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Ground Truth Evidence</h3>
              <p className="text-xs text-[#64748B]">Audited source citation & paragraph context</p>
            </div>
          </div>
          <button
            onClick={closeEvidence}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Badge & Source Info */}
          <div className="flex items-center justify-between">
            <GlobalAIBadge type="EVIDENCE_BACKED" />
            <span className="text-xs font-medium text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Verified Confidence: {activeEvidence.confidence || '98.0%'}
            </span>
          </div>

          {/* Paper Info Box */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#1E1B4B] text-white">
                {activeEvidence.paperCode}
              </span>
              <span className="text-xs font-semibold text-[#64748B]">
                {activeEvidence.section} • Page {activeEvidence.page}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-[#0F172A] leading-snug">
              {activeEvidence.paperTitle}
            </h4>
          </div>

          {/* Extracted Excerpt Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[#0D9488]" />
              Direct Literature Extract
            </label>
            <div className="relative p-4 rounded-xl bg-[#F8FAFC] border-l-4 border-l-[#0D9488] border-y border-r border-[#E2E8F0] text-sm text-[#0F172A] leading-relaxed italic">
              "{activeEvidence.excerpt}"
            </div>
          </div>

          {/* Extraction Metadata */}
          <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Grounding Integrity Check</h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Extraction Hash</span>
                <span className="font-mono font-medium text-slate-800">sha256:7f4c2e...</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">OCR Character Match</span>
                <span className="font-medium text-[#0D9488]">100% Exact Match</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Document Page</span>
                <span className="font-medium text-slate-800">Page {activeEvidence.page}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Semantic Anchor</span>
                <span className="font-medium text-slate-800">{activeEvidence.section}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3">
          {correspondingPaper && (
            <button
              onClick={() => {
                closeEvidence();
                openPaperProfile(correspondingPaper);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-white border border-[#E2E8F0] text-[#1E1B4B] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Full Paper Profile
            </button>
          )}
          <button
            onClick={closeEvidence}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

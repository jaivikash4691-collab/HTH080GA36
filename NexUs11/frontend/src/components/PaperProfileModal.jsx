import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { X, FileText, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { GlobalAIBadge } from './GlobalAIBadge';

export const PaperProfileModal = () => {
  const { selectedPaperProfile, closePaperProfile, openEvidence } = useResearch();

  if (!selectedPaperProfile) return null;

  const p = selectedPaperProfile;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-[#1E1B4B] text-white p-6 relative">
          <button
            onClick={closePaperProfile}
            className="absolute top-5 right-5 p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4F46E5] text-white">
              {p.code}
            </span>
            <span className="text-xs text-slate-300">
              {p.year} • {p.pages} Pages
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight pr-6">
            {p.title}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Authors: {p.authors}
          </p>
        </div>

        {/* Body Matrix */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">METHOD</span>
              <span className="text-sm font-bold text-[#1E1B4B] mt-0.5 block">{p.method}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">DATASET</span>
              <span className="text-sm font-bold text-[#0F172A] mt-0.5 block">{p.dataset}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">SAMPLE SIZE</span>
              <span className="text-sm font-bold text-[#0F172A] mt-0.5 block">{p.sampleSize} subjects</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">EVALUATION</span>
              <span className="text-sm font-bold text-[#0F172A] mt-0.5 block">{p.evaluationMetric}</span>
            </div>
          </div>

          {/* Main Finding & Limitation */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#0D9488]/5 border border-[#0D9488]/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] block">MAIN RESULT</span>
                <p className="text-sm font-semibold text-[#0F172A] mt-0.5">{p.mainResult}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#D97706]/5 border border-[#D97706]/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] block">LIMITATIONS</span>
                <p className="text-sm font-medium text-[#0F172A] mt-0.5">{p.limitation}</p>
              </div>
            </div>
          </div>

          {/* Abstract */}
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">Abstract Excerpt</span>
            <p className="text-xs text-[#64748B] leading-relaxed bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
              {p.abstract}
            </p>
          </div>

          {/* Evidence at bottom (Section 11) */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E1B4B]" />
              <span className="text-xs font-semibold text-[#0F172A]">
                Key Evidence: Results — Page {p.pages > 10 ? '8' : '4'}
              </span>
            </div>
            <button
              onClick={() => {
                closePaperProfile();
                openEvidence(`${p.code}-p${p.pages > 10 ? '8' : '4'}`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 transition-colors cursor-pointer"
            >
              <span>View Source</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

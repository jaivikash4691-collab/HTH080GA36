import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { X, FileText, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { GlobalAIBadge } from './GlobalAIBadge';

export const PaperProfileModal = () => {
  const { selectedPaperProfile, closePaperProfile } = useResearch();

  if (!selectedPaperProfile) return null;

  const p = selectedPaperProfile;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in-up">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="bg-[#1E1B4B] dark:bg-[#0F172A] text-white p-6 relative border-b dark:border-[#334155]">
          <button
            onClick={closePaperProfile}
            className="absolute top-5 right-5 p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4F46E5] text-white">
              {p.code}
            </span>
            <span className="text-xs text-slate-300">
              {p.year || 2024} • {p.pages || 1} Pages
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight pr-6">
            {p.title}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Authors: {p.authors || 'Research Author et al.'}
          </p>
        </div>

        {/* Body Matrix */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">METHOD</span>
              <span className="text-sm font-bold text-[#1E1B4B] dark:text-[#F8FAFC] mt-0.5 block">{p.method || 'Empirical Architecture'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">DATASET</span>
              <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5 block">{p.dataset || 'Validation Benchmark'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">SAMPLE SIZE</span>
              <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5 block">{p.sampleSize || 'N/A'} subjects</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">EVALUATION</span>
              <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5 block">{p.evaluationMetric || 'Accuracy • Precision'}</span>
            </div>
          </div>

          {/* Main Finding & Limitation */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#0D9488]/5 dark:bg-[#0D9488]/10 border border-[#0D9488]/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] block">KEY FINDINGS</span>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">{p.mainResult || 'Extracted and verified findings from document.'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#D97706]/5 dark:bg-[#D97706]/10 border border-[#D97706]/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] block">LIMITATIONS</span>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mt-0.5">{p.limitation || 'Domain shift and sample constraints.'}</p>
              </div>
            </div>
          </div>

          {/* Abstract */}
          {p.abstract && (
            <div>
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block mb-1.5">Abstract Excerpt</span>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#334155]">
                {p.abstract}
              </p>
            </div>
          )}

          {/* Document footer */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E1B4B] dark:text-[#38BDF8]" />
              <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Document Indexed: {p.filename || `${p.title}.pdf`}
              </span>
            </div>
            <button
              onClick={closePaperProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#1E1B4B] dark:bg-[#2563EB] text-white hover:bg-[#1E1B4B]/90 transition-colors cursor-pointer"
            >
              <span>Close Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { AlertCircle, Check, FileText } from 'lucide-react';
import { EvidenceStrengthBadge } from './EvidenceStrengthBadge';
import { EvidenceChip } from './EvidenceChip';

export const ContradictionHunterView = () => {
  const { contradictionHunterItems, openEvidence, papers } = useResearch();

  const items = contradictionHunterItems || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#E11D48] bg-rose-50 px-2.5 py-0.5 rounded-full">
            Discrepancy Engine • Cross-Study Divergence
          </span>
          <h2 className="text-2xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Contradiction Hunter
          </h2>
          <p className="text-xs text-[#64748B]">
            Empirical claim comparisons isolating hardware, dataset, and metric factors behind divergent results.
          </p>
        </div>

        <EvidenceStrengthBadge strength="CONFLICTING" size="md" />
      </div>

      {items.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1B4B]">No contradictions found yet</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {papers.length < 2
              ? 'Upload 2 or more research papers to compare empirical claims and detect conflicting evidence.'
              : 'Multi-paper analysis has not detected any statistical divergence across your uploaded literature.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="nexus-hover-card p-6 sm:p-8 space-y-6 border-t-4 border-t-[#E11D48]"
            >
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#E11D48]">
                  EMPIRICAL CLAIM UNDER INVESTIGATION
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#1E1B4B] leading-snug">
                  "{item.claim}"
                </h3>
              </div>

              {/* Comparison Cards: Paper A vs Paper B */}
              {item.paperA && item.paperB && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E1B4B]">
                        {item.paperA.code}
                      </span>
                      <span className="text-xs font-semibold text-[#0D9488]">Reported Efficacy</span>
                    </div>
                    <div className="text-2xl font-black text-[#1E1B4B]">
                      {item.paperA.metric}
                    </div>
                    <div className="text-xs text-[#64748B] space-y-1 pt-1">
                      <div><strong>Dataset:</strong> {item.paperA.dataset}</div>
                      <div><strong>Model:</strong> {item.paperA.model}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50/30 border border-rose-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E1B4B]">
                        {item.paperB.code}
                      </span>
                      <span className="text-xs font-semibold text-[#E11D48]">Degraded Efficacy</span>
                    </div>
                    <div className="text-2xl font-black text-[#E11D48]">
                      {item.paperB.metric}
                    </div>
                    <div className="text-xs text-[#64748B] space-y-1 pt-1">
                      <div><strong>Dataset:</strong> {item.paperB.dataset}</div>
                      <div><strong>Model:</strong> {item.paperB.model}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContradictionHunterView;

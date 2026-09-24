import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { HelpCircle, ArrowRight, FileText } from 'lucide-react';
import { EvidenceStrengthBadge } from '../components/EvidenceStrengthBadge';
import { EvidenceChip } from '../components/EvidenceChip';

export const GapsPage = ({ onNavigate }) => {
  const { gapRadarItems, openValidateGap, openEvidence, papers } = useResearch();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Methodological Blindspot', 'Evaluation Gap', 'Dataset & Population Bias', 'Deployment & Latency Barrier', 'Theoretical Conflict', 'Cross-Disciplinary Void'];

  const filteredItems = (gapRadarItems || []).filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory
  );

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#D97706]">
              Signature Capability • Gap Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
            Research Gap Radar
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Systematic taxonomy of 6 research gap categories across the literature with granular validation audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <EvidenceStrengthBadge strength="SUPPORTED" size="md" />
          <button
            type="button"
            onClick={() => onNavigate('strategy')}
            className="px-4 py-2 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Turn Gaps Into Strategy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#1E1B4B] text-white shadow-xs'
                : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Empty State or Radar Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1B4B]">No research gaps discovered yet</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {papers.length === 0
              ? 'Upload research papers and run multi-paper analysis to reveal empirical and methodological gaps across studies.'
              : 'No matching gaps found for this category in your uploaded documents.'}
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
          {filteredItems.map((item, idx) => {
            const paperCodes = item.paperCodes || item.evidenceIds || [];
            const strength = item.evidenceStrength || item.validation?.classification || 'SUPPORTED';

            return (
              <div
                key={item.id || idx}
                className="nexus-hover-card p-6 sm:p-7 space-y-5 border-t-4 border-t-[#D97706]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded">
                    RESEARCH GAP #{idx + 1} • {item.category}
                  </span>
                  <EvidenceStrengthBadge strength={strength} size="xs" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-[#1E1B4B]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#0F172A] leading-relaxed">
                    {item.description || item.summary}
                  </p>
                </div>

                {/* Supporting Papers */}
                {paperCodes.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Supporting Papers
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {paperCodes.map((pid, pidx) => (
                        <EvidenceChip key={pidx} id={pid} label={pid} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openValidateGap(item)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#D97706] text-white text-xs font-bold hover:bg-[#D97706]/90 transition-all shadow-xs cursor-pointer"
                  >
                    Validate Gap
                  </button>

                  {paperCodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openEvidence(paperCodes[0])}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-bold text-[#1E1B4B] hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Evidence</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GapsPage;

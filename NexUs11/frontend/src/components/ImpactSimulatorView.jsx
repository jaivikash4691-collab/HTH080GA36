import React from 'react';
import { useResearch } from '../context/ResearchContext';
import { Sliders, Clock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { EvidenceStrengthBadge } from './EvidenceStrengthBadge';

export const ImpactSimulatorView = () => {
  const { impactSimulator, timeMonths, setTimeMonths } = useResearch();

  if (!impactSimulator || !impactSimulator.timePresets) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0D9488] mx-auto flex items-center justify-center">
          <Sliders className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Impact Simulation Available</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload and analyze research papers to simulate implementation feasibility, data readiness, and novelty boundaries.
        </p>
      </div>
    );
  }

  const activePreset = impactSimulator.timePresets[timeMonths] || impactSimulator.timePresets[3] || {
    recommendation: 'Adjust timeline slider to preview strategic feasibility.',
    feasibleProjects: [],
  };

  const heuristicIndicators = impactSimulator.heuristicIndicators || [];

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full">
            Heuristic Feasibility Analysis
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Research Impact Simulator
          </h3>
          <p className="text-xs text-[#64748B]">
            Transparent estimation of implementation effort, data readiness, and novelty boundaries.
          </p>
        </div>

        <EvidenceStrengthBadge strength="INFERRED" size="sm" />
      </div>

      {/* Transparent Heuristic Indicators Grid */}
      {heuristicIndicators.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {heuristicIndicators.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] text-center space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                {item.name}
              </span>
              <div className="text-xl font-black text-[#1E1B4B]">
                {item.score}
              </div>
              <span className="text-[10px] font-bold text-[#0D9488] block">
                {item.level}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Time Allocation Slider */}
      <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B]">
              Time Allocation Constraint: <span className="text-[#2563EB] text-sm font-black">"I have {timeMonths} months"</span>
            </span>
          </div>
          <span className="text-xs text-[#64748B]">Slide to adjust research timeline</span>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="3"
          max="12"
          step="3"
          value={timeMonths}
          onChange={(e) => setTimeMonths(Number(e.target.value))}
          className="w-full accent-[#1E1B4B] cursor-pointer"
        />

        <div className="flex justify-between text-xs font-bold text-[#64748B] px-1">
          <span className={timeMonths === 3 ? 'text-[#2563EB]' : ''}>3 Months (Rapid)</span>
          <span className={timeMonths === 6 ? 'text-[#2563EB]' : ''}>6 Months (Grant)</span>
          <span className={timeMonths === 12 ? 'text-[#2563EB]' : ''}>12 Months (Full Trial)</span>
        </div>
      </div>

      {/* Tailored Feasible Directions for Chosen Time */}
      <div className="p-5 rounded-2xl bg-teal-50/40 border border-teal-200 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span className="text-xs font-black uppercase tracking-wider text-[#0D9488]">
            RECOMMENDED STRATEGY FOR {timeMonths}-MONTH HORIZON
          </span>
        </div>

        <p className="text-xs text-[#0F172A] font-semibold leading-relaxed">
          {activePreset.recommendation}
        </p>

        {(activePreset.feasibleProjects || []).length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Feasible Sub-Projects:
            </span>
            {activePreset.feasibleProjects.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-[#0F172A]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Important Disclaimer Note */}
      <div className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
        <span><strong>Transparent Heuristics Note:</strong> These are algorithmic estimations based on sample sizes, dataset availability, and compute needs, not scientifically verified guarantees.</span>
      </div>
    </div>
  );
};

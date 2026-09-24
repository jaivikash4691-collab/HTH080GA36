import React from 'react';
import { useResearch } from '../context/ResearchContext';
import {
  FlaskConical,
  Database,
  Layers,
  Sparkles,
  GitBranch,
  BarChart3,
  CheckCircle2,
  Award,
  ArrowRight,
} from 'lucide-react';
import { EvidenceStrengthBadge } from './EvidenceStrengthBadge';

export const ExperimentPlannerView = () => {
  const { experimentPlan } = useResearch();

  if (!experimentPlan) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] mx-auto flex items-center justify-center">
          <FlaskConical className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Experiment Plan Available</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload and analyze research papers to generate an automated peer-review-grade experiment blueprint and protocol.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
            Strategic Protocol Design
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Experiment Planner & Protocol Blueprint
          </h3>
          <p className="text-xs text-[#64748B]">
            Automated translation from synthesized gap into a peer-review-grade experiment workflow.
          </p>
        </div>

        <EvidenceStrengthBadge strength="INFERRED" size="md" />
      </div>

      {/* Target Objective Banner */}
      <div className="p-4 rounded-xl bg-[#1E1B4B] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
            SELECTED EMPIRICAL OPPORTUNITY
          </span>
          <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
            {experimentPlan.selectedOpportunity || 'High-Impact Novel Direction'}
          </span>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#0D9488] text-white text-xs font-bold shrink-0">
          Target: High-Impact Publication
        </span>
      </div>

      {/* Visual Experiment Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Objective */}
        <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-[#2563EB]" />
            1. Research Objective
          </span>
          <p className="text-xs text-[#0F172A] leading-relaxed">
            {experimentPlan.objective || 'Empirical validation of research hypotheses.'}
          </p>
        </div>

        {/* 2. Datasets Required */}
        <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#0D9488] flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#0D9488]" />
            2. Datasets Required
          </span>
          <p className="text-xs text-[#0F172A] leading-relaxed">
            {experimentPlan.datasetRequired || 'Primary and multi-center evaluation cohorts.'}
          </p>
        </div>

        {/* 3. Baseline Model */}
        <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#64748B]" />
            3. Comparative Baselines
          </span>
          <p className="text-xs text-[#0F172A] leading-relaxed">
            {experimentPlan.baseline || 'Standard comparative baselines from reviewed literature.'}
          </p>
        </div>

        {/* 4. Proposed Method */}
        <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200 space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            4. Proposed Novel Architecture
          </span>
          <p className="text-xs text-[#0F172A] font-semibold leading-relaxed">
            {experimentPlan.proposedMethod || 'Novel synthesized pipeline.'}
          </p>
        </div>
      </div>

      {/* Structured Experiments Checklist */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] block">
          5. Core Experimental Benchmarks
        </span>
        <div className="space-y-2">
          {(experimentPlan.experiments || []).map((exp, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-start gap-3 shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-[#1E1B4B] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div>
                <span className="text-xs font-bold text-[#1E1B4B] block">{exp.name}</span>
                <span className="text-[11px] text-[#64748B]">{exp.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ablation Study & Contribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ablation Study */}
        <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#D97706] flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-[#D97706]" />
            6. Ablation Study Protocol
          </span>
          <ul className="space-y-1.5 text-xs text-[#0F172A]">
            {(experimentPlan.ablationStudy || []).map((abl, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                <span>{abl}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Expected Contribution */}
        <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#0D9488] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#0D9488]" />
            7. Expected Scientific Contribution
          </span>
          <p className="text-xs text-[#0F172A] font-medium leading-relaxed">
            {experimentPlan.expectedContribution || 'Rigorous empirical evidence and open reproducible code.'}
          </p>
          <div className="text-[11px] font-bold text-[#0D9488] pt-1">
            Metrics: {experimentPlan.evaluationMetrics || 'AUROC, F1-score, Latency'}
          </div>
        </div>
      </div>
    </div>
  );
};

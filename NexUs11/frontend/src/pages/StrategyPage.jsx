import React, { useState } from 'react';
import { ResearchDirectionCard } from '../components/ResearchDirectionCard';
import { ExperimentPlannerView } from '../components/ExperimentPlannerView';
import { ResearchIdeaLineageView } from '../components/ResearchIdeaLineageView';
import { ImpactSimulatorView } from '../components/ImpactSimulatorView';
import { useResearch } from '../context/ResearchContext';
import {
  FileCheck2,
  ArrowRight,
  Lightbulb,
  FlaskConical,
  GitCommit,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { EvidenceStrengthBadge } from '../components/EvidenceStrengthBadge';
import { EvidenceChip } from '../components/EvidenceChip';

export const StrategyPage = ({ onNavigate }) => {
  const { researchMode, setResearchMode, researchOpportunities, papers } = useResearch();
  const [activeTab, setActiveTab] = useState('direction');

  const strategyModes = [
    { id: 'literature_review', label: 'Literature Review' },
    { id: 'gap_discovery', label: 'Find Research Gap' },
    { id: 'novel_topic', label: 'Find Novel Topic' },
    { id: 'experiment_design', label: 'Design Experiment' },
    { id: 'proposal', label: 'Prepare Proposal' },
  ];

  const subTabs = [
    { id: 'direction', label: 'Proposed Direction', icon: Lightbulb },
    { id: 'opportunities', label: 'Opportunities & Questions', icon: Sparkles },
    { id: 'planner', label: 'Experiment Planner', icon: FlaskConical },
    { id: 'lineage', label: 'Idea Lineage Trail', icon: GitCommit },
    { id: 'impact', label: 'Impact Simulator', icon: Sliders },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-full">
            Strategic Roadmap Formulation
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight mt-1.5 flex items-center gap-2">
            <span>Research Strategy Engine</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Turn multi-paper evidence and identified gaps into publishable research questions, experiments, and actionable grants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <EvidenceStrengthBadge strength="INFERRED" size="md" />
          <button
            type="button"
            onClick={() => onNavigate('report')}
            className="px-4 py-2 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Generate Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {papers.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1B4B]">No research directions available yet</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            Upload research papers and complete multi-paper analysis to generate experimental designs and actionable research directions.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="px-4 py-2 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#2A2663] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Upload Papers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Strategy Mode Objectives Selector */}
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-2 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] block">
              Select Strategic Investigation Objective
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {strategyModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setResearchMode(mode.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    researchMode === mode.id
                      ? 'bg-[#1E1B4B] text-white shadow-2xs'
                      : 'bg-[#FBF9F5] border border-[#E2E8F0] text-[#64748B] hover:bg-slate-100'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Tabs: Direction, Opportunities, Planner, Lineage, Impact */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1E1B4B] text-white shadow-xs'
                      : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Proposed Direction */}
          {activeTab === 'direction' && <ResearchDirectionCard />}

          {/* Tab 2: Opportunities & Research Questions */}
          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {(researchOpportunities || []).map((opp, idx) => (
                  <div
                    key={opp.id || idx}
                    className="nexus-hover-card p-6 sm:p-7 space-y-4 border-t-4 border-t-[#2563EB]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded">
                        OPPORTUNITY #{idx + 1}
                      </span>
                      <EvidenceStrengthBadge strength="INFERRED" size="xs" />
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-[#1E1B4B]">
                      {opp.title}
                    </h3>

                    <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1 text-xs">
                      <span className="font-bold text-[#1E1B4B] block">Potential Research Question:</span>
                      <p className="text-[#0F172A] italic leading-relaxed">"{opp.question}"</p>
                    </div>

                    <div className="text-xs text-[#64748B]">
                      <strong>Suggested Methodology:</strong> {opp.suggestedMethodology}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Experiment Planner */}
          {activeTab === 'planner' && <ExperimentPlannerView />}

          {/* Tab 4: Idea Lineage Trail */}
          {activeTab === 'lineage' && <ResearchIdeaLineageView />}

          {/* Tab 5: Impact Simulator */}
          {activeTab === 'impact' && <ImpactSimulatorView />}
        </>
      )}
    </div>
  );
};

export default StrategyPage;

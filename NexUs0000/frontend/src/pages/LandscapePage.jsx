import React, { useState } from 'react';
import { ResearchLandscapeCharts } from '../components/ResearchLandscapeCharts';
import { KnowledgeGraphView } from '../components/KnowledgeGraphView';
import { MethodologyTimelineView } from '../components/MethodologyTimelineView';
import { ResearchFrontierMapView } from '../components/ResearchFrontierMapView';
import { UnexploredCombinationsView } from '../components/UnexploredCombinationsView';
import { useResearch } from '../context/ResearchContext';
import { Layers, ArrowLeft, ArrowRight, Network, Compass, Calendar, Sparkles, Database, Brain, GitCommit } from 'lucide-react';

export const LandscapePage = ({ onBack, onNavigate }) => {
  const { topic, papers, multiPaperBrain } = useResearch();
  const [activeTab, setActiveTab] = useState('brain');

  const tabs = [
    { id: 'brain', label: 'Multi-Paper Brain', icon: Brain },
    { id: 'knowledge_graph', label: 'Knowledge Graph', icon: Network },
    { id: 'frontier_map', label: '2D Frontier Map', icon: Compass },
    { id: 'timeline', label: 'Methodology Evolution', icon: Calendar },
    { id: 'charts', label: 'Plotly Distributions', icon: Layers },
    { id: 'combinations', label: 'Unexplored Combinations', icon: Sparkles },
  ];

  if (!papers || papers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in-up pb-12">
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
            Connected Research Command Center
          </span>
        </div>

        <div className="glass-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#1E1B4B] mx-auto flex items-center justify-center">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1E1B4B]">No Research Landscape Available</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Upload and analyze research papers to generate the multi-paper research brain, knowledge graph relationships, and 2D frontier territory mapping.
          </p>
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('upload') : onBack()}
            className="px-5 py-2.5 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#2A2663] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Upload Papers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              Connected Research Command Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
            Research Landscape & Connected Intelligence
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Combined multi-paper research brain, knowledge graph relationships, and 2D frontier territory mapping.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* Tab 1: Multi-Paper Research Brain */}
      {activeTab === 'brain' && (
        <div className="space-y-6">
          {multiPaperBrain && (
            <div className="nexus-hover-card p-6 sm:p-8 space-y-4 bg-white border-t-4 border-t-[#2563EB]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded">
                  SECTION 09 • MULTI-PAPER RESEARCH BRAIN
                </span>
              </div>

              <h3 className="text-lg font-black text-[#1E1B4B]">
                {multiPaperBrain.synthesisTitle}
              </h3>

              <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed bg-[#FBF9F5] p-4 rounded-xl border border-[#E2E8F0]">
                "{multiPaperBrain.coreTakeaway}"
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {(multiPaperBrain.matrixComparison || []).map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                      {m.metric}
                    </span>
                    <div className="text-xs font-bold text-[#1E1B4B]">
                      {m.highest || m.heavyweight || m.verified || 'Evaluated'}
                    </div>
                    {m.lowest && (
                      <div className="text-xs font-bold text-[#E11D48]">
                        {m.lowest}
                      </div>
                    )}
                    <p className="text-[11px] text-[#64748B] pt-1 line-clamp-2">
                      {m.explanation || m.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <KnowledgeGraphView />
        </div>
      )}

      {/* Tab 2: Knowledge Graph */}
      {activeTab === 'knowledge_graph' && (
        <KnowledgeGraphView />
      )}

      {/* Tab 3: 2D Frontier Map */}
      {activeTab === 'frontier_map' && (
        <ResearchFrontierMapView />
      )}

      {/* Tab 4: Methodology Timeline */}
      {activeTab === 'timeline' && (
        <MethodologyTimelineView />
      )}

      {/* Tab 5: Plotly Empirical Charts */}
      {activeTab === 'charts' && (
        <ResearchLandscapeCharts />
      )}

      {/* Tab 6: Unexplored Combinations */}
      {activeTab === 'combinations' && (
        <UnexploredCombinationsView />
      )}
    </div>
  );
};

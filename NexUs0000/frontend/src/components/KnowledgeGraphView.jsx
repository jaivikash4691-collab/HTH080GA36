import React, { useState, useEffect } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Network, FileText } from 'lucide-react';

export const KnowledgeGraphView = () => {
  const { knowledgeGraph, openValidateGap, gapRadarItems, papers } = useResearch();
  const [selectedNode, setSelectedNode] = useState(knowledgeGraph?.nodes?.[0] || null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!selectedNode && knowledgeGraph?.nodes?.length > 0) {
      setSelectedNode(knowledgeGraph.nodes[0]);
    }
  }, [knowledgeGraph, selectedNode]);

  const nodeColorMap = {
    paper: '#1E1B4B',
    method: '#2563EB',
    dataset: '#0D9488',
    gap: '#D97706',
  };

  const nodes = knowledgeGraph?.nodes || [];
  const links = knowledgeGraph?.links || [];

  const filteredNodes = nodes.filter(
    (n) => filterType === 'all' || n.type === filterType
  );

  const connectedLinks = links.filter(
    (l) => l.source === selectedNode?.id || l.target === selectedNode?.id
  );

  if (nodes.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-3 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
          <Network className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#1E1B4B]">No knowledge graph generated yet</h3>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto">
          Upload research papers and run analysis to map interconnected entities across your research documents.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
            Knowledge Graph • Connected Intelligence
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Research Knowledge Graph
          </h3>
          <p className="text-xs text-[#64748B]">
            Interactive relationship map linking papers, algorithms, datasets, and synthesized gaps.
          </p>
        </div>

        {/* Filter Pill Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['all', 'paper', 'method', 'dataset', 'gap'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-[#1E1B4B] text-white shadow-xs'
                  : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph Visual Canvas */}
        <div className="lg:col-span-8 bg-[#FBF9F5] rounded-2xl border border-[#E2E8F0] p-6 relative min-h-[380px] flex flex-col justify-between overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#1E1B4B 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="text-[11px] font-bold text-[#64748B] flex items-center justify-between relative z-10">
            <span>Click any node to inspect semantic relationships</span>
            <span className="text-[#0D9488]">● {nodes.length} Nodes Indexed • {links.length} Relationships</span>
          </div>

          {/* Interactive Node Cloud */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-auto py-6 relative z-10">
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const nodeColor = nodeColorMap[node.type] || '#1E1B4B';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none ${
                    isSelected
                      ? 'bg-white border-[#1E1B4B] shadow-md scale-102 ring-2 ring-[#1E1B4B]/10'
                      : 'bg-white/80 border-[#E2E8F0] hover:bg-white hover:border-[#1E1B4B]/30 hover:scale-101'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: nodeColor }}
                    >
                      {node.type}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#1E1B4B]" />}
                  </div>
                  <div className="text-xs font-bold text-[#1E1B4B] truncate" title={node.name || node.label}>
                    {node.name || node.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graph Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-[#64748B] pt-4 border-t border-[#E2E8F0] relative z-10">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1E1B4B]" /> Papers</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Methods</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" /> Datasets</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Research Gaps</span>
          </div>
        </div>

        {/* Selected Node Inspector Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 shadow-xs">
          {selectedNode ? (
            <>
              <div className="border-b border-[#E2E8F0] pb-3">
                <span
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white inline-block mb-1.5"
                  style={{ backgroundColor: nodeColorMap[selectedNode.type] || '#1E1B4B' }}
                >
                  {selectedNode.type} Node
                </span>
                <h4 className="text-base font-black text-[#1E1B4B]">
                  {selectedNode.name || selectedNode.label}
                </h4>
              </div>

              {/* Connected Relationships */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Active Relationships ({connectedLinks.length})
                </span>
                {connectedLinks.length === 0 ? (
                  <p className="text-xs text-[#64748B]">No direct relationships linked yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {connectedLinks.map((link, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-semibold text-[#1E1B4B]">{link.source}</span>
                        <span className="text-[#2563EB] font-bold px-1.5">[{link.relation || 'related to'}]</span>
                        <span className="font-semibold text-[#1E1B4B]">{link.target}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#64748B] text-xs">
              Select any graph node to inspect verified connections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphView;

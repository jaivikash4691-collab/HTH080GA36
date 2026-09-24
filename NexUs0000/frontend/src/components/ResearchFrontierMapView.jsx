import React from 'react';
import Plot from 'react-plotly.js';
import { useResearch } from '../context/ResearchContext';
import { Compass, Sparkles, Layers } from 'lucide-react';

export const ResearchFrontierMapView = () => {
  const { frontierMapData = [] } = useResearch();

  const dataList = frontierMapData || [];

  if (dataList.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] mx-auto flex items-center justify-center">
          <Compass className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Frontier Territory Mapped</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload and analyze research papers to plot the 2D scientific frontier across methodological complexity and dataset diversity.
        </p>
      </div>
    );
  }

  const normalPoints = dataList.filter((p) => !p.isOpportunity);
  const opportunityPoint = dataList.find((p) => p.isOpportunity);

  const plotData = [
    {
      type: 'scatter',
      mode: 'markers+text',
      name: 'Analyzed Papers',
      x: normalPoints.map((p) => p.x),
      y: normalPoints.map((p) => p.y),
      text: normalPoints.map((p) => p.name),
      textposition: 'top center',
      marker: {
        size: 16,
        color: '#1E1B4B',
        opacity: 0.85,
        line: { width: 2, color: '#2563EB' },
      },
      hoverinfo: 'text',
    },
  ];

  if (opportunityPoint) {
    plotData.push({
      type: 'scatter',
      mode: 'markers+text',
      name: 'Potential Under-Explored Area',
      x: [opportunityPoint.x],
      y: [opportunityPoint.y],
      text: ['★ NEXUS Proposed Frontier'],
      textposition: 'bottom center',
      marker: {
        size: 22,
        color: '#0D9488',
        symbol: 'diamond',
        line: { width: 3, color: '#2563EB' },
      },
      hoverinfo: 'text',
    });
  }

  return (
    <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
            2D Scientific Landscape
          </span>
          <h3 className="text-xl font-black text-[#1E1B4B] tracking-tight mt-1">
            Research Frontier Map
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Mapping crowded existing methodologies against possible under-explored clinical territories.
          </p>
        </div>
      </div>

      {/* Plotly 2D Scatter Map */}
      <div className="w-full h-80 bg-white rounded-2xl p-2 border border-[#E2E8F0]">
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            margin: { l: 60, r: 40, t: 20, b: 50 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            xaxis: {
              title: { text: 'Methodological Complexity & Multi-Modal Fusion →', font: { size: 11, color: '#64748B' } },
              range: [0.1, 1.05],
              gridcolor: '#F1F5F9',
            },
            yaxis: {
              title: { text: 'Dataset Heterogeneity & Multi-Center Diversity →', font: { size: 11, color: '#64748B' } },
              range: [0.1, 1.05],
              gridcolor: '#F1F5F9',
            },
            showlegend: true,
            legend: {
              orientation: 'h',
              y: -0.22,
              font: { size: 10, color: '#64748B' },
            },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex flex-wrap items-center justify-between text-xs text-[#64748B]">
        <span><strong>Terminology Note:</strong> NEXUS identifies this coordinate as a <em>Potential opportunity</em> / <em>Possible under-explored area</em> within analyzed corpus.</span>
        <span className="text-[#0D9488] font-bold">Uncrowded High-Impact Territory</span>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { useResearch } from '../context/ResearchContext';
import { ProgressPipeline } from '../components/ProgressPipeline';
import { RefreshCw } from 'lucide-react';

export const AnalysisPage = ({ onViewLandscape }) => {
  const { runAnalysis, analysisStatus } = useResearch();

  // If entering page while idle, automatically run
  useEffect(() => {
    if (analysisStatus === 'idle') {
      runAnalysis();
    }
  }, [analysisStatus]);

  return (
    <div className="py-8 space-y-6">
      <div className="flex justify-end max-w-2xl mx-auto">
        <button
          type="button"
          onClick={runAnalysis}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E1B4B] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Analysis Pipeline</span>
        </button>
      </div>

      <ProgressPipeline onCompleteAction={onViewLandscape} />
    </div>
  );
};

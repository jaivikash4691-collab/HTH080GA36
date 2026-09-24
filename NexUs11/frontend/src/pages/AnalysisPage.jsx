import React, { useEffect } from 'react';
import { useResearch } from '../context/ResearchContext';
import { ProgressPipeline } from '../components/ProgressPipeline';
import { RefreshCw, FileText } from 'lucide-react';

export const AnalysisPage = ({ onViewLandscape, onNavigate }) => {
  const { runAnalysis, analysisStatus } = useResearch();

  // If entering page while idle, automatically run
  useEffect(() => {
    if (analysisStatus === 'idle') {
      runAnalysis();
    }
  }, [analysisStatus]);

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => onNavigate?.('analyzed_paper')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Analyzed Paper</span>
        </button>

        <button
          type="button"
          onClick={runAnalysis}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E1B4B] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Analysis Pipeline</span>
        </button>
      </div>

      <ProgressPipeline
        onCompleteAction={() => onNavigate?.('analyzed_paper')}
        onViewAnalyzedPaper={() => onNavigate?.('analyzed_paper')}
      />
    </div>
  );
};

export default AnalysisPage;

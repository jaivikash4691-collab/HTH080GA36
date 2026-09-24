import React, { useState } from 'react';
import { Sparkles, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../context/ResearchContext';

export const JudgeTourBanner = ({ currentView, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { runAnalysis } = useResearch();

  const tourSteps = [
    { id: 'landing', label: '1. NEXUS Hero' },
    { id: 'auth', label: '2. Authentication' },
    { id: 'papers_discovery', label: '3. Discover Papers' },
    { id: 'upload', label: '4. Upload Papers' },
    { id: 'analysis', label: '5. 10-Step Pipeline' },
    { id: 'dashboard', label: '6. Dashboard Sessions' },
    { id: 'landscape', label: '7. Graph & 2D Map' },
    { id: 'comparison', label: '8. Comparison Matrix' },
    { id: 'findings', label: '9. Common Findings' },
    { id: 'contradictions', label: '10. Contradiction Hunter' },
    { id: 'gaps', label: '11. Gap Radar & Validation' },
    { id: 'ask', label: '12. Ask NEXUS (Firewall)' },
    { id: 'strategy', label: '13. Strategy & Lineage' },
    { id: 'report', label: '14. Academic Report (PDF)' },
    { id: 'feedback', label: '15. Researcher Feedback' },
  ];

  const currentIndex = tourSteps.findIndex((s) => s.id === currentView);

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % tourSteps.length;
    const nextStep = tourSteps[nextIndex];
    if (nextStep.id === 'analysis') {
      runAnalysis();
    }
    if (!user && nextStep.id !== 'landing' && nextStep.id !== 'auth') {
      onNavigate('auth');
      return;
    }
    onNavigate(nextStep.id);
  };

  const handleJump = (stepId) => {
    if (!user && stepId !== 'landing' && stepId !== 'auth') {
      onNavigate('auth');
      return;
    }
    if (stepId === 'analysis') {
      runAnalysis();
    }
    onNavigate(stepId);
  };

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="px-4 py-2.5 rounded-full bg-[#1E1B4B] text-white text-xs font-black shadow-xl border border-indigo-400 flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#0D9488]" />
          <span>⚡ 30s Quick Tour</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Hackathon Quick Tour"
      className="sticky top-0 z-40 w-full bg-[#1E1B4B] text-white border-b border-indigo-900/60 shadow-md py-2 px-3 sm:px-6"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D9488] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]"></span>
          </span>
          <span className="font-black uppercase tracking-wider text-[11px] text-amber-300">
            ⚡ Quick Tour:
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-2xl">
          {tourSteps.map((step, idx) => {
            const isActive = currentView === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleJump(step.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0D9488] text-white ring-2 ring-white/30 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1 rounded-lg bg-white text-[#1E1B4B] font-black text-xs hover:bg-slate-100 flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse tour banner"
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

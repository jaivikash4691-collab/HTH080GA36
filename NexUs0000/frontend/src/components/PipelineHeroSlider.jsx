import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, AlertCircle, Compass, Layers, Sparkles, BookOpen } from 'lucide-react';

export const PipelineHeroSlider = ({ onSlideAction }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = [
    {
      id: 0,
      stepNumber: '01 / 05',
      category: 'DISCOVER',
      heading: 'DISCOVER THE RESEARCH LANDSCAPE',
      explanation: 'Ingest 5–8 papers to map methodologies, cohorts, and temporal evolution across the literature.',
      cta: 'Explore Research Map',
      targetView: 'landscape',
      visualType: 'map',
    },
    {
      id: 1,
      stepNumber: '02 / 05',
      category: 'CONNECT',
      heading: 'CONNECT FINDINGS ACROSS PAPERS',
      explanation: 'NexUs links findings across studies, verifying how transformers compare to CNNs across differing clinical datasets.',
      cta: 'View Comparison Matrix',
      targetView: 'comparison',
      visualType: 'comparison',
    },
    {
      id: 2,
      stepNumber: '03 / 05',
      category: 'DETECT',
      heading: 'DETECT CONTRADICTIONS',
      explanation: 'Detect hidden performance gaps between studies (e.g. 94.2% vs 81.7%) and isolate contributing scanner and population differences.',
      cta: 'Inspect Contradictions',
      targetView: 'contradictions',
      visualType: 'contradiction',
    },
    {
      id: 3,
      stepNumber: '04 / 05',
      category: 'DISCOVER GAPS',
      heading: 'RESEARCH GAP RADAR',
      explanation: 'Systematically surfaces 6 gap categories: Methodological, Dataset, Application, Contradiction, Evaluation, and Temporal.',
      cta: 'Launch Gap Radar',
      targetView: 'gaps',
      visualType: 'gaps',
    },
    {
      id: 4,
      stepNumber: '05 / 05',
      category: 'STRATEGIZE',
      heading: 'TURN GAPS INTO STRATEGY',
      explanation: 'Convert identified research gaps into testable research questions, hypotheses, experiment protocols, and publishable 12-month roadmaps.',
      cta: 'Generate Research Strategy',
      targetView: 'strategy',
      visualType: 'strategy',
    },
  ];

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const active = slides[currentSlide];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full max-w-5xl mx-auto rounded-3xl bg-white border border-[#E2E8F0] shadow-md p-6 sm:p-10 transition-all overflow-hidden"
    >
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#1E1B4B]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#0D9488]/5 blur-3xl pointer-events-none" />

      {/* Slide Navigation Top Bar */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-md">
            {active.stepNumber}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            {active.category} • RESEARCH PIPELINE
          </span>
        </div>

        {/* Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="w-8 h-8 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 flex items-center justify-center text-[#1E1B4B] cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="w-8 h-8 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 flex items-center justify-center text-[#1E1B4B] cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[260px]">
        {/* Left Column: Information & CTA */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight leading-snug">
            {active.heading}
          </h2>

          <p className="text-sm sm:text-base text-[#64748B] leading-relaxed max-w-lg">
            {active.explanation}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onSlideAction(active.targetView)}
              className="px-6 py-3 rounded-xl bg-[#1E1B4B] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1E1B4B]/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
            >
              <span>{active.cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Research Preview Cards */}
        <div className="lg:col-span-5 flex justify-center">
          {active.visualType === 'map' && (
            <div className="w-full max-w-sm nexus-hover-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs font-bold text-[#1E1B4B] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#0D9488]" />
                  AI Research Map
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-[#FBF9F5] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">Paper 01</span>
                  <span className="font-black text-[#1E1B4B]">CNN • Biobank</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FBF9F5] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">Paper 03</span>
                  <span className="font-black text-[#0D9488]">Transformer 95%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FBF9F5] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">Paper 02</span>
                  <span className="font-black text-[#2563EB]">Tree SHAP 88%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FBF9F5] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block">Paper 05</span>
                  <span className="font-black text-[#E11D48]">Multi-Site NHS</span>
                </div>
              </div>
              <div className="text-[11px] text-center text-[#64748B] font-medium pt-1">
                ↓ Harmonized into single interconnected knowledge map
              </div>
            </div>
          )}

          {active.visualType === 'comparison' && (
            <div className="w-full max-w-sm nexus-hover-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0D9488] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                  Citation Grounding
                </span>
              </div>
              <div className="p-3 rounded-xl bg-teal-50/40 border border-teal-100 text-xs text-[#0F172A] italic">
                "On the held-out test cohort of 9,040 patients, the proposed model achieved 94.2% accuracy..."
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-mono font-bold text-[#1E1B4B] bg-slate-100 px-2 py-0.5 rounded">
                  [P1 • Results • p7]
                </span>
                <span className="text-[#0D9488] font-bold">100% OCR Match</span>
              </div>
            </div>
          )}

          {active.visualType === 'contradiction' && (
            <div className="w-full max-w-sm nexus-hover-card p-5 space-y-3 border-t-4 border-t-[#E11D48]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E11D48] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#E11D48]" />
                  Discrepancy Detected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-500">P1 (Biobank)</div>
                  <div className="text-lg font-black text-[#1E1B4B]">94.2%</div>
                </div>
                <div className="border-l border-slate-200">
                  <div className="text-[10px] text-slate-500">P5 (Multi-Site)</div>
                  <div className="text-lg font-black text-[#E11D48]">81.7%</div>
                </div>
              </div>
              <div className="text-[11px] text-[#2563EB] bg-blue-50/60 p-2 rounded-lg font-medium">
                Possible Explanation: Uncalibrated scanner hardware across hospitals.
              </div>
            </div>
          )}

          {active.visualType === 'gaps' && (
            <div className="w-full max-w-sm nexus-hover-card p-5 space-y-3 border-t-4 border-t-[#D97706]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D97706] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D97706]" />
                  Gap Radar #01
                </span>
              </div>
              <div className="text-xs font-bold text-[#1E1B4B]">
                Dataset Diversity & Generalization
              </div>
              <p className="text-[11px] text-[#64748B]">
                5 / 8 papers evaluate Western biobanks. Non-European cohorts remain understudied.
              </p>
              <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-[#D97706]">
                <span>Citations: P1 • P2 • P4 • P5</span>
                <span className="underline cursor-pointer">Validate Gap →</span>
              </div>
            </div>
          )}

          {active.visualType === 'strategy' && (
            <div className="w-full max-w-sm nexus-hover-card p-5 space-y-3 border-t-4 border-t-[#1E1B4B]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E1B4B] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#2563EB]" />
                  Research Strategy
                </span>
              </div>
              <div className="text-xs font-bold text-[#0F172A] leading-snug">
                Self-Supervised Test-Time Adaptation Architecture
              </div>
              <div className="space-y-1 text-[11px] text-[#64748B]">
                <div>✓ Resolves 12.5% multi-site gap</div>
                <div>✓ Feasible in 3.5 months</div>
                <div>✓ High publishability impact</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Dots Bottom */}
      <div className="flex items-center justify-center gap-2 pt-6 border-t border-[#E2E8F0] mt-6">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentSlide(idx)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              idx === currentSlide ? 'w-8 bg-[#1E1B4B]' : 'w-2 bg-[#CBD5E1] hover:bg-[#64748B]'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

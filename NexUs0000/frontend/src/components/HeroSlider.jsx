import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, AlertCircle, FileSearch, Sparkles, BookOpen, Layers } from 'lucide-react';
import { GlobalAIBadge } from './GlobalAIBadge';

export const HeroSlider = ({ onStartResearch, onHowItWorks }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides = [
    {
      id: 0,
      badge: 'Academic Literature Intelligence',
      title: 'From Research Papers to Research Strategy.',
      subtext: 'Upload 5–8 papers. Compare findings. Discover contradictions. Find research gaps. Explore what comes next.',
      type: 'hero',
    },
    {
      id: 1,
      badge: 'Automated Scientific Pipeline',
      title: 'A Rigorous 5-Stage Meta-Synthesis Engine',
      subtext: 'Transform fragmented PDF studies into harmonized comparative matrices, empirical verification, and actionable next steps.',
      type: 'pipeline',
    },
    {
      id: 2,
      badge: 'Zero Hallucination Guarantee',
      title: 'Every Claim, Traced Directly to its Source',
      subtext: 'Deep granular paragraph anchors and confidence scores allow instant audit from high-level synthesis down to verbatim publication pages.',
      type: 'verification',
    },
    {
      id: 3,
      badge: 'Critical Discrepancy Discovery',
      title: 'See Where the Literature Disagrees',
      subtext: 'Detect hidden performance contradictions caused by clinical domain shift, uncalibrated scanners, or demographic bias.',
      type: 'contradiction',
    },
  ];

  // 5s interval auto-rotate with pause on hover
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border border-[#E2E8F0] bg-gradient-to-b from-white via-[#F8FAFC] to-indigo-50/20 p-8 sm:p-12 lg:p-16 transition-all shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Decorative subtle Indigo aura */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#1E1B4B]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#0D9488]/5 blur-3xl pointer-events-none" />

      {/* Slide Content Area */}
      <div className="relative min-h-[380px] sm:min-h-[320px] flex flex-col justify-center">
        {slides.map((slide, index) => {
          if (index !== currentSlide) return null;

          return (
            <div
              key={slide.id}
              className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              {/* Left Column: Text & CTAs */}
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-[#1E1B4B] bg-[#1E1B4B]/10 border border-[#1E1B4B]/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>{slide.badge}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
                  {slide.title}
                </h1>

                <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
                  {slide.subtext}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={onStartResearch}
                    className="px-6 py-3 rounded-xl bg-[#1E1B4B] text-white font-bold text-sm hover:bg-[#1E1B4B]/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Start Research</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onHowItWorks}
                    className="px-6 py-3 rounded-xl bg-white border border-[#E2E8F0] text-[#1E1B4B] font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    How it works
                  </button>
                </div>
              </div>

              {/* Right Column: Visual Preview according to slide type */}
              <div className="lg:col-span-5 flex justify-center">
                {slide.type === 'hero' && (
                  <div className="w-full max-w-md p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-3.5">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#1E1B4B]" />
                        <span className="text-xs font-bold text-[#0F172A]">AI Disease Prediction Literature</span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded">
                        5 Papers Staged
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                        <span className="font-semibold text-[#0F172A]">Methodology Concordance</span>
                        <span className="font-bold text-[#0D9488]">4 / 5 Agree</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                        <span className="font-semibold text-[#0F172A]">Generalization Contradiction</span>
                        <span className="font-bold text-[#E11D48]">94.2% vs 81.7%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                        <span className="font-semibold text-[#0F172A]">Identified Research Gap</span>
                        <span className="font-bold text-[#D97706]">Cross-Dataset Shift</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <GlobalAIBadge type="PAPER_GROUNDED" size="sm" />
                      <span className="text-[11px] text-[#64748B]">Audited 386 citations</span>
                    </div>
                  </div>
                )}

                {slide.type === 'pipeline' && (
                  <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-4">
                    <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                      Autonomous Stepper
                    </span>
                    <div className="space-y-3">
                      {['Upload 5-8 PDFs', 'Compare Methodologies', 'Detect Contradictions', 'Discover Research Gaps', 'Strategize Next Frontier'].map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-semibold text-[#0F172A]">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {slide.type === 'verification' && (
                  <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0D9488] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                        Citation Grounding
                      </span>
                      <GlobalAIBadge type="PAPER_GROUNDED" size="sm" />
                    </div>

                    <div className="p-3.5 rounded-xl bg-teal-50/30 border border-teal-100 text-xs text-[#0F172A] italic">
                      "On the held-out test cohort of 9,040 patients, the proposed model achieved an overall accuracy of 94.2%..."
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-[#1E1B4B] text-[#1E1B4B] bg-white font-mono text-xs font-bold shadow-xs">
                        [P1 • Results • p7]
                      </div>
                      <span className="text-xs text-[#64748B]">Click opens exact PDF page</span>
                    </div>
                  </div>
                )}

                {slide.type === 'contradiction' && (
                  <div className="w-full max-w-md p-6 rounded-2xl bg-white border-t-4 border-t-[#E11D48] border border-[#E2E8F0] shadow-md space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#E11D48] uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-[#E11D48]" />
                        Performance Contradiction
                      </span>
                      <span className="text-xs font-medium text-slate-500">Cross-Study Check</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <div className="text-[11px] text-slate-500">Paper 01 (Biobank)</div>
                        <div className="text-xl font-black text-[#0F172A]">94.2%</div>
                      </div>
                      <div className="border-l border-slate-200">
                        <div className="text-[11px] text-slate-500">Paper 05 (NHS Multi)</div>
                        <div className="text-xl font-black text-[#E11D48]">81.7%</div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-indigo-50/60 border border-indigo-100 text-[11px] text-[#4F46E5] font-medium">
                      AI Inference: Variance is caused by unharmonized clinical scanner protocols.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: Manual Arrows & Dots */}
      <div className="mt-8 pt-6 border-t border-[#E2E8F0]/60 flex items-center justify-between">
        {/* Dot Indicators */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentSlide
                  ? 'w-8 bg-[#1E1B4B]'
                  : 'w-2 bg-[#CBD5E1] hover:bg-[#64748B]'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Arrow Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

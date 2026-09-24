import React from 'react';
import { CentralNexusHero } from '../components/CentralNexusHero';
import { PipelineHeroSlider } from '../components/PipelineHeroSlider';
import {
  BookOpen,
  Search,
  AlertTriangle,
  Lightbulb,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Compass,
  GitBranch,
  Award,
  Database,
  Network,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

export const LandingPage = ({ onStartResearch, onOpenAuth, onNavigate }) => {
  // Section 7: 8-Step Visual Pipeline
  const visualPipeline = [
    { title: 'UPLOAD PAPERS', desc: 'Ingest research PDFs/DOCs into session memory', icon: BookOpen },
    { title: 'EXTRACT FINDINGS', desc: 'Granular key findings and methodology extraction', icon: ShieldCheck },
    { title: 'BUILD RESEARCH BRAIN', desc: 'Cross-paper extraction of models, datasets & variables', icon: Database },
    { title: 'CONNECT PAPERS', desc: 'Semantic alignment across multi-study outcomes', icon: Network },
    { title: 'FIND CONTRADICTIONS', desc: 'Isolating statistical divergences (94.2% vs 81.7%)', icon: AlertTriangle },
    { title: 'DETECT GAPS', desc: 'Surfacing author limits & meta-synthesis blindspots', icon: HelpCircle },
    { title: 'GENERATE OPPORTUNITIES', desc: 'Unexplored test-time adaptation combinations', icon: Lightbulb },
    { title: 'BUILD RESEARCH STRATEGY', desc: 'Executable 12-month experiment & grant roadmap', icon: Compass },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Section 2 & 3: CENTER NEXUS TITLE HERO */}
      <section className="pt-2">
        <CentralNexusHero
          onDiscover={() => onNavigate('papers_discovery')}
          onAnalyze={onStartResearch}
        />
      </section>

      {/* Section 4 & 5: HERO SLIDER CONTENT (MOVED DOWN BELOW NEXUS TITLE) */}
      <section className="pt-2">
        <PipelineHeroSlider onSlideAction={(view) => onNavigate(view)} />
      </section>

      {/* Section 7: WHAT IS NEXUS, WHY WAS IT DEVELOPED, WHAT MAKES IT DIFFERENT */}
      <section className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-black uppercase tracking-widest text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full">
            Core Philosophy & Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1E1B4B] tracking-tight">
            Not a PDF Summarizer. A Multi-Paper Research Intelligence Platform.
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
            Conventional tools summarize papers in isolation. NEXUS connects findings across papers to identify defensible research opportunities and construct actionable research strategies.
          </p>
        </div>

        {/* 4 Pillars Grid: What, Why, How, Difference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="nexus-hover-card p-6 space-y-3 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-black text-[#1E1B4B]">WHAT IS NEXUS?</h3>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed">
              NEXUS is an academic meta-synthesis platform that creates a combined multi-paper research brain from scientific studies, evaluating methodology shifts, dataset variance, and empirical contradictions.
            </p>
          </div>

          <div className="nexus-hover-card p-6 space-y-3 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-black text-[#1E1B4B]">WHY WAS IT DEVELOPED?</h3>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed">
              Researchers waste hundreds of hours cross-referencing tables, only to miss subtle domain contradictions (e.g. models failing across unharmonized hospitals) and field-wide blindspots.
            </p>
          </div>

          <div className="nexus-hover-card p-6 space-y-3 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-black text-[#1E1B4B]">WHAT MAKES IT DIFFERENT?</h3>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed">
              Zero-hallucination document grounding: every generated gap, opportunity, and research question is grounded in author limitations and verified citations.
            </p>
          </div>

          <div className="nexus-hover-card p-6 space-y-3 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#4F46E5] flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="text-base font-black text-[#1E1B4B]">HOW CAN A RESEARCHER USE IT?</h3>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed">
              Upload literature on any topic, run the 10-stage intelligence pipeline, explore the 6-category Research Gap Radar, and export a complete 9-section publication-grade experiment strategy.
            </p>
          </div>
        </div>
      </section>

      {/* Section 7: Animated Visual Pipeline (Scroll-Animated Horizontal / Vertical Flow) */}
      <section className="glass-card p-8 sm:p-12 max-w-5xl mx-auto space-y-8 bg-white">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0D9488] bg-teal-50 px-3 py-1 rounded-full">
            Autonomous Pipeline
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
            The 8-Stage Research Intelligence Flow
          </h2>
          <p className="text-xs text-[#64748B]">
            From raw publication PDFs into an actionable research strategy
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {visualPipeline.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="nexus-hover-card p-4 rounded-xl border border-[#E2E8F0] space-y-2 bg-[#FBF9F5]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                    STAGE 0{idx + 1}
                  </span>
                  <Icon className="w-4 h-4 text-[#1E1B4B]" />
                </div>
                <div className="text-xs font-bold text-[#1E1B4B] leading-tight">
                  {step.title}
                </div>
                <p className="text-[11px] text-[#64748B] leading-snug">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={onStartResearch}
            className="px-8 py-3.5 rounded-xl bg-[#1E1B4B] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1E1B4B]/90 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
          >
            <span>Analyze Literature Workspace</span>
            <ArrowRight className="w-4 h-4 text-[#0D9488]" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-[#E2E8F0] max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#1E1B4B] text-white font-black flex items-center justify-center text-xs">
            N
          </div>
          <span className="font-bold text-[#1E1B4B]">NEXUS Research Intelligence</span>
          <span>— From Research Papers to Research Strategy</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate('feedback')}
            className="hover:text-[#1E1B4B] font-semibold cursor-pointer"
          >
            Feedback
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="hover:text-[#1E1B4B] font-semibold cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </footer>
    </div>
  );
};

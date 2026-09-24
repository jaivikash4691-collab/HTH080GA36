import React from 'react';
import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sparkles, BookOpen, Layers, Compass, CheckCircle2 } from 'lucide-react';

export const AuthPage = ({ onAuthSuccess, onBackToLanding }) => {
  const { authMode } = useAuth();

  const isRegister = authMode === 'register';

  return (
    <div className="min-h-[88vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Soft Indigo Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#1E1B4B]/5 via-[#4F46E5]/5 to-transparent pointer-events-none" />

      {/* Return button */}
      <div className="w-full max-w-5xl mb-4 z-10">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Homepage</span>
        </button>
      </div>

      <div className="w-full max-w-5xl relative z-10 grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* SIDE SECTION (Exact wording required by specification) */}
        <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#2A2663] to-[#1E1B4B] text-white p-8 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden border border-[#312E81]">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563EB]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#0D9488]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo / Brand */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#1E1B4B] font-black text-xl flex items-center justify-center shadow-md">
                N
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                NEXUS
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-[11px] font-semibold tracking-wide border border-white/10">
              <Sparkles className="w-3 h-3 text-[#38BDF8]" />
              <span>Literature Intelligence Platform</span>
            </div>
          </div>

          {/* Middle: Content with EXACT required wording */}
          <div className="relative z-10 my-8 space-y-4">
            {isRegister ? (
              <>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                  Build your research workspace.
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Analyze papers. Discover connections. Explore new research directions.
                </p>
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Upload PDF preprints and published research papers</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Cross-paper contradiction hunter & gap radar</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Isolated workspace with verified document grounding</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                  From Research Papers to Research Strategy
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Discover research patterns, explore potential gaps, and turn literature into research direction.
                </p>
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Synthesize multi-paper consensus and findings</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Identify unaddressed methodology gaps in your domain</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>Export clean structured document reports and PDF briefs</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom badge */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>Ground-Truth Verification</span>
            <span className="font-semibold text-white/90">NEXUS Intelligence</span>
          </div>
        </div>

        {/* AUTH CARD FORM */}
        <div className="lg:col-span-6 flex items-center">
          <AuthCard onSuccess={onAuthSuccess} />
        </div>
      </div>
    </div>
  );
};

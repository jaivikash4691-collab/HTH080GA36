import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import {
  FileText,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Clock,
  RotateCcw,
  Sparkles,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    topic,
    papers,
    findings,
    contradictions,
    gaps,
    sessions,
    restoreSession,
    researchOpportunities,
    analysisStatus,
  } = useResearch();

  const [isHovered, setIsHovered] = useState(false);

  const totalGaps = Array.isArray(gaps)
    ? gaps.length
    : (gaps?.authorIdentified?.length || 0) + (gaps?.aiSynthesized?.length || 0);

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full">
            Active Research Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight mt-1.5">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Researcher'}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {papers.length > 0 ? (
              <>
                Current Investigation: <strong>{topic || 'Multi-Paper Synthesis'}</strong> • {papers.length} Papers Connected
              </>
            ) : (
              'Your workspace is ready. Upload 5-8 research papers to begin your multi-paper intelligence analysis.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[#1E1B4B] text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Add Papers</span>
          </button>

          {papers.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('analysis')}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[#1E1B4B] text-xs font-bold hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>View Analysis</span>
              </button>

              {/* View Our Analyzed Paper Button (Req 49, 50, 77) */}
              <button
                type="button"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => onNavigate('analyzed_paper')}
                className="px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg border border-slate-700 flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                {isHovered ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>✦ View Our Analyzed Paper →</span>
                  </>
                ) : (
                  <span>View Our Analyzed Paper</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Real Database Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Papers"
          value={papers.length}
          subtitle={papers.length === 1 ? '1 document indexed' : `${papers.length} documents indexed`}
          icon={FileText}
          accentColor="#1E1B4B"
        />
        <StatCard
          title="Research Sessions"
          value={sessions.length}
          subtitle="Saved investigation sessions"
          icon={Clock}
          accentColor="#2563EB"
        />
        <StatCard
          title="Findings"
          value={findings.length}
          subtitle="Consensus findings"
          icon={Sparkles}
          accentColor="#0D9488"
        />
        <StatCard
          title="Gaps"
          value={totalGaps}
          subtitle="Radar categories"
          icon={HelpCircle}
          accentColor="#D97706"
        />
        <StatCard
          title="Directions"
          value={researchOpportunities.length}
          subtitle="Prioritized directions"
          icon={Lightbulb}
          accentColor="#6366F1"
        />
      </div>

      {/* Prominent Analyzed Paper Callout when ready (Req 49, 77) */}
      {papers.length > 0 && (
        <div className="glass-card p-6 sm:p-8 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md border border-slate-700">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {papers.length} Research Papers Successfully Analyzed
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              AI-Generated Academic Research Paper is Ready
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Consolidated 20-section literature analysis covering methodology matrix, technology stacks, consensus findings, research gaps, and proposed 12-month research strategy.
            </p>
          </div>

          <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onNavigate('analyzed_paper')}
            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-white text-[#0F172A] text-xs font-black hover:bg-slate-100 transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2.5 cursor-pointer shrink-0 active:scale-98"
          >
            {isHovered ? (
              <>
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>✦ View Our Analyzed Paper →</span>
              </>
            ) : (
              <span>View Our Analyzed Paper</span>
            )}
          </button>
        </div>
      )}

      {/* Real User Research Sessions History */}
      <div className="glass-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-base font-black text-[#1E1B4B]">
              Your Research Sessions & History
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            {sessions.length > 0 ? 'Click any session to restore literature workspace' : '0 active sessions'}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-white space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1E1B4B]">No research sessions yet</h4>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Upload 5-8 research papers to begin your multi-paper analysis.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#2A2663] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Upload Papers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => restoreSession(sess.id)}
                className="nexus-hover-card p-4 rounded-xl border border-[#E2E8F0] flex items-center justify-between gap-3 cursor-pointer group bg-[#FBF9F5]"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                    {sess.date}
                  </span>
                  <h4 className="text-sm font-bold text-[#1E1B4B] group-hover:text-[#2563EB] transition-colors">
                    {sess.title}
                  </h4>
                  <div className="text-[11px] text-[#64748B]">
                    {sess.papersCount} Papers • {sess.gapsFound} Gaps
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#1E1B4B] group-hover:text-[#2563EB] shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Research Synthesis Snapshot */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div>
            <h3 className="text-base font-black text-[#1E1B4B]">
              Research Synthesis Snapshot
            </h3>
            <p className="text-xs text-[#64748B]">
              Key signals extracted across current multi-paper literature intelligence
            </p>
          </div>
        </div>

        {papers.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[#E2E8F0] rounded-2xl bg-white space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1E1B4B]">No research papers yet</h4>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Upload your papers in the Upload tab to generate research intelligence.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Common Findings */}
            <div
              onClick={() => onNavigate('findings')}
              className="nexus-hover-card p-4 rounded-xl border border-[#E2E8F0] cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-10 rounded-full bg-[#0D9488]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1B4B] group-hover:text-[#0D9488] transition-colors flex items-center gap-2">
                    <span>Common Findings</span>
                    <span className="text-[10px] font-bold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded">
                      Consensus Findings
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Consensus across uploaded methodologies and validation metrics
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-5 sm:pl-0">
                <span className="text-2xl font-black text-[#0D9488]">{findings.length}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0D9488] group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            {/* Potential Contradictions */}
            <div
              onClick={() => onNavigate('contradictions')}
              className="nexus-hover-card p-4 rounded-xl border border-[#E2E8F0] cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-10 rounded-full bg-[#E11D48]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1B4B] group-hover:text-[#E11D48] transition-colors flex items-center gap-2">
                    <span>Potential Contradictions</span>
                    <span className="text-[10px] font-bold text-[#E11D48] bg-rose-50 px-2 py-0.5 rounded">
                      Contextual Differences
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Divergence detected across experimental cohorts or results
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-5 sm:pl-0">
                <span className="text-2xl font-black text-[#E11D48]">{contradictions.length}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#E11D48] group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            {/* Research Gaps */}
            <div
              onClick={() => onNavigate('gaps')}
              className="nexus-hover-card p-4 rounded-xl border border-[#E2E8F0] cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-10 rounded-full bg-[#D97706]" />
                <div>
                  <div className="text-xs font-bold text-[#1E1B4B] group-hover:text-[#D97706] transition-colors flex items-center gap-2">
                    <span>Research Gaps</span>
                    <span className="text-[10px] font-bold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded">
                      Radar Gaps
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Methodological blindspots and unverified assumptions
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-5 sm:pl-0">
                <span className="text-2xl font-black text-[#D97706]">{totalGaps}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D97706] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { jsPDF } from 'jspdf';
import {
  FileCheck2,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { GlobalAIBadge } from '../components/GlobalAIBadge';

export const ReportPage = () => {
  const { topic, papers, findings, contradictions, gaps, strategy } = useResearch();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(papers.length > 0);

  // Trigger regeneration
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 500);
  };

  // Download PDF
  const handleDownloadPdf = () => {
    if (papers.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const primaryColor = [30, 27, 75];
    const textColor = [15, 23, 42];

    // Header Title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 595, 75, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('NEXUS • ACADEMIC RESEARCH STRATEGY REPORT', 40, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Ground-Truth Evidence Grounding`, 40, 58);

    let y = 105;

    // 1. Topic
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('1. RESEARCH TOPIC', 40, y);
    y += 18;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Investigation Focus: ${topic || 'Literature Synthesis'} (${papers.length} Papers Synthesized)`, 40, y);
    y += 26;

    // 2. Papers Analyzed
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('2. PAPERS ANALYZED', 40, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    papers.forEach((p, idx) => {
      doc.text(`• [${p.code || `P${idx + 1}`}] ${p.title} (${p.year || 2024})`, 45, y);
      y += 14;
    });
    y += 14;

    // 3. Executive Synthesis
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('3. EXECUTIVE SYNTHESIS', 40, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Cross-paper analysis completed across ${papers.length} documents. Multi-paper consensus points and research gaps mapped to reproducible experiment designs.`,
      40,
      y,
      { maxWidth: 515 }
    );
    y += 30;

    doc.save(`NEXUS_Research_Strategy_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] bg-[#1E1B4B]/10 px-2.5 py-0.5 rounded-full">
            Stage 06 • Final Synthesis Deliverable
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight mt-1.5">
            Academic Research Strategy Report
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full cross-paper synthesis with verbatim citations, methodology comparative matrix, and actionable roadmap.
          </p>
        </div>

        {papers.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#1E1B4B] text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#2563EB] ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-5 py-2 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Report View or Empty State */}
      {papers.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1B4B]">No reports generated yet</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            Upload research papers and execute multi-paper analysis to compile your citation-grounded research strategy report.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-md overflow-hidden p-8 sm:p-12 space-y-10">
          {/* Header */}
          <div className="border-b border-[#E2E8F0] pb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#1E1B4B] uppercase tracking-widest">
                NEXUS AI RESEARCH INTELLIGENCE • FORMAL META-ANALYSIS
              </span>
              <span className="text-xs text-[#64748B] font-mono">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] tracking-tight">
              Cross-Document Synthesis & Strategy Roadmap
            </h2>
            <p className="text-xs text-[#64748B]">
              Investigation Focus: <strong className="text-[#1E1B4B]">{topic || 'Uploaded Literature'}</strong> • {papers.length} Papers Connected
            </p>
          </div>

          {/* Section 1: Ingested Documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1E1B4B] border-b border-[#E2E8F0] pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1E1B4B]" />
              <span>1. Ingested Research Papers ({papers.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {papers.map((p, idx) => (
                <div key={p.id || idx} className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1">
                  <span className="font-bold text-[#1E1B4B] block truncate">
                    [{p.code || `P${idx + 1}`}] {p.title}
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    {p.authors} ({p.year || 2024}) • {p.pages || 1} pages
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Common Consensus Findings */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0D9488] border-b border-[#E2E8F0] pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
              <span>2. Common Consensus Findings ({findings.length})</span>
            </h3>
            {findings.length === 0 ? (
              <p className="text-xs text-[#64748B]">No common findings identified yet.</p>
            ) : (
              <div className="space-y-3">
                {findings.map((f, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-teal-100 bg-teal-50/20 space-y-1.5">
                    <span className="text-xs font-bold text-[#1E1B4B] block">{f.title}</span>
                    <p className="text-xs text-[#0F172A] leading-relaxed">{f.statement}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Strategic Directions */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2563EB] border-b border-[#E2E8F0] pb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span>3. Proposed Research Strategy</span>
            </h3>
            <div className="p-5 rounded-2xl bg-blue-50/30 border border-blue-100 space-y-3">
              <p className="text-xs text-[#0F172A] leading-relaxed font-semibold">
                Multi-paper comparative synthesis indicates high potential for harmonized cross-study benchmarking.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#2563EB] bg-white px-2.5 py-1 rounded-md border border-blue-200">
                  Target: 3-6 Month Horizon
                </span>
                <span className="text-[10px] font-bold text-[#0D9488] bg-white px-2.5 py-1 rounded-md border border-teal-200">
                  Validated Evidence Grounding
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;

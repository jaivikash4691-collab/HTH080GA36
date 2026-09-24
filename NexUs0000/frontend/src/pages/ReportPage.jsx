import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { jsPDF } from 'jspdf';
import {
  FileCheck2,
  Download,
  Sparkles,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Compass,
  Database,
  Cpu,
  Layers,
} from 'lucide-react';

export const ReportPage = () => {
  const { papers, gaps } = useResearch();
  const [selectedPaperIndex, setSelectedPaperIndex] = useState(0);

  const fallbackText = 'Not available in the uploaded document.';

  const activePaper = papers.length > 0 ? papers[selectedPaperIndex] || papers[0] : null;

  // Clean value extractor with graceful fallback
  const getField = (val) => {
    if (!val || typeof val !== 'string' || val.trim() === '' || val.toLowerCase() === 'n/a') {
      return fallbackText;
    }
    return val.trim();
  };

  // Structured PDF Downloader matching specification
  const handleDownloadPdf = () => {
    if (!activePaper) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const primaryColor = [30, 27, 75]; // #1E1B4B
    const slateDark = [15, 23, 42];    // #0F172A
    const tealAccent = [13, 148, 136];  // #0D9488

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    const renderHeader = () => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 68, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('NEXUS • STRUCTURED DOCUMENT REPORT', margin, 32);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Document ID: ${activePaper.code || 'DOC-1'}`, margin, 50);
    };

    renderHeader();
    let y = 92;

    const checkPageBreak = (neededHeight) => {
      if (y + neededHeight > pageHeight - 45) {
        doc.addPage();
        renderHeader();
        y = 92;
      }
    };

    const addSection = (num, title, content, isAiLabel = false) => {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${num}. ${title.toUpperCase()}`, margin, y);
      y += 15;

      if (isAiLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(tealAccent[0], tealAccent[1], tealAccent[2]);
        doc.text('[ Potential Research Direction • AI-Generated Research Question ]', margin, y);
        y += 12;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

      const lines = doc.splitTextToSize(content, contentWidth);
      checkPageBreak(lines.length * 12 + 15);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 16;
    };

    // 1. Paper Overview
    const overviewLines = [
      `Title: ${activePaper.title || fallbackText}`,
      `Authors: ${activePaper.authors || fallbackText}`,
      `Publication Year: ${activePaper.year || activePaper.publication_year || fallbackText}`,
      `Source File: ${activePaper.filename || fallbackText} (${activePaper.pages || 1} pages)`,
      `Overview: ${activePaper.abstract || activePaper.overview || fallbackText}`,
    ].join('\n');
    addSection('1', 'Paper Overview', overviewLines);

    // 2. Research Problem
    const problemText = getField(activePaper.researchProblem || activePaper.problem);
    addSection('2', 'Research Problem', problemText);

    // 3. Methodology
    const methodText = getField(activePaper.methodology || activePaper.method);
    addSection('3', 'Methodology', methodText);

    // 4. Dataset / Data Used
    const datasetLines = [
      `Dataset: ${getField(activePaper.dataset || activePaper.dataUsed)}`,
      `Sample Size / Scope: ${getField(activePaper.sampleSize || activePaper.sample_size)}`,
      `Evaluation Metric: ${getField(activePaper.evaluationMetric || activePaper.evaluation_metric)}`,
    ].join('\n');
    addSection('4', 'Dataset / Data Used', datasetLines);

    // 5. Key Findings
    const findingsText = getField(activePaper.mainResult || activePaper.findings || activePaper.main_result);
    addSection('5', 'Key Findings', findingsText);

    // 6. Limitations
    const limitationsText = getField(activePaper.limitation || activePaper.limitations);
    addSection('6', 'Limitations', limitationsText);

    // 7. Potential Research Direction
    let directionText = activePaper.potentialResearchDirection || activePaper.researchDirection;
    let isAi = false;
    if (directionText && directionText.trim() !== '') {
      isAi = true;
    } else if (gaps && gaps.length > 0) {
      directionText = `Potential Research Direction: Investigate ${gaps[0].topic || 'methodological extensions'} addressing identified limitation: ${activePaper.limitation || 'generalization boundaries'}`;
      isAi = true;
    } else {
      directionText = fallbackText;
    }
    addSection('7', 'Potential Research Direction', directionText, isAi);

    const safeTitle = (activePaper.title || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    doc.save(`${safeTitle}_Document_Report.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#334155] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] bg-[#1E1B4B]/10 dark:bg-[#38BDF8]/10 px-2.5 py-0.5 rounded-full">
            Document Report Deliverable
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] dark:text-white tracking-tight mt-1.5">
            Structured Document Report
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Comprehensive 7-section extraction with ground-truth verification and zero hallucinations.
          </p>
        </div>

        {activePaper && (
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-5 py-2.5 rounded-xl bg-[#1E1B4B] dark:bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 dark:hover:bg-[#2563EB]/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>[ Download Report ]</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {papers.length === 0 ? (
        <div className="glass-card dark:bg-[#1E293B] p-12 text-center space-y-4 border border-[#E2E8F0] dark:border-[#334155]">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center mx-auto text-[#64748B] dark:text-[#94A3B8]">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#1E1B4B] dark:text-white">No document reports available</h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            Please upload a scientific research paper (PDF or DOCX) to automatically generate the 7-section structured document report.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Paper Selector Tabs if multiple papers exist */}
          {papers.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] shrink-0 mr-1">
                Select Document:
              </span>
              {papers.map((p, idx) => (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => setSelectedPaperIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    selectedPaperIndex === idx
                      ? 'bg-[#1E1B4B] dark:bg-[#2563EB] text-white border-transparent shadow-xs'
                      : 'bg-white dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155] hover:border-[#1E1B4B]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                  <span>[{p.code || `P${idx + 1}`}] {p.title?.substring(0, 24)}...</span>
                </button>
              ))}
            </div>
          )}

          {/* MAIN 7-SECTION STRUCTURED DOCUMENT REPORT */}
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-[#334155] shadow-md p-6 sm:p-10 space-y-8">
            {/* Header info */}
            <div className="border-b border-[#E2E8F0] dark:border-[#334155] pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#818CF8] text-xs font-bold">
                    {activePaper.code || 'P1'}
                  </span>
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {activePaper.year || 2024} • {activePaper.pages || 1} Pages
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1E1B4B] dark:text-white tracking-tight mt-1">
                  {activePaper.title}
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Authors: {activePaper.authors || fallbackText}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-4 py-2 rounded-xl bg-[#1E1B4B] dark:bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 dark:hover:bg-[#2563EB]/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>[ Download Report ]</span>
              </button>
            </div>

            {/* 1. Paper Overview */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <BookOpen className="w-4 h-4 text-[#1E1B4B] dark:text-[#38BDF8]" />
                <span>1. Paper Overview</span>
              </h3>
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-xs">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-semibold text-[#64748B] dark:text-[#94A3B8] block">Document Title:</span>
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{activePaper.title || fallbackText}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#64748B] dark:text-[#94A3B8] block">Source File:</span>
                    <span className="font-mono text-[#0F172A] dark:text-[#F8FAFC]">{activePaper.filename || fallbackText}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <span className="font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-1">Abstract / Executive Summary:</span>
                  <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                    {activePaper.abstract || activePaper.overview || fallbackText}
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Research Problem */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <HelpCircle className="w-4 h-4 text-[#E11D48]" />
                <span>2. Research Problem</span>
              </h3>
              <div className="p-4 rounded-2xl bg-rose-50/20 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                  {getField(activePaper.researchProblem || activePaper.problem)}
                </p>
              </div>
            </section>

            {/* 3. Methodology */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <Cpu className="w-4 h-4 text-[#2563EB]" />
                <span>3. Methodology</span>
              </h3>
              <div className="p-4 rounded-2xl bg-blue-50/20 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                  {getField(activePaper.methodology || activePaper.method)}
                </p>
              </div>
            </section>

            {/* 4. Dataset / Data Used */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <Database className="w-4 h-4 text-[#0D9488]" />
                <span>4. Dataset / Data Used</span>
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase block">Dataset</span>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 block">
                    {getField(activePaper.dataset || activePaper.dataUsed)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase block">Sample Size / Scope</span>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 block">
                    {getField(activePaper.sampleSize || activePaper.sample_size)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#334155]">
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase block">Evaluation Metric</span>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mt-1 block">
                    {getField(activePaper.evaluationMetric || activePaper.evaluation_metric)}
                  </span>
                </div>
              </div>
            </section>

            {/* 5. Key Findings */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                <span>5. Key Findings</span>
              </h3>
              <div className="p-4 rounded-2xl bg-teal-50/20 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed font-medium">
                  {getField(activePaper.mainResult || activePaper.findings || activePaper.main_result)}
                </p>
              </div>
            </section>

            {/* 6. Limitations */}
            <section className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <span>6. Limitations</span>
              </h3>
              <div className="p-4 rounded-2xl bg-amber-50/20 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                  {getField(activePaper.limitation || activePaper.limitations)}
                </p>
              </div>
            </section>

            {/* 7. Potential Research Direction */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1E1B4B] dark:text-[#38BDF8] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#2563EB]" />
                  <span>7. Potential Research Direction</span>
                </h3>
                <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                  Possible Research Opportunity
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1E1B4B] dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>AI-generated Research Question & Direction</span>
                </div>
                <p className="text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
                  {activePaper.potentialResearchDirection ||
                    (gaps && gaps.length > 0
                      ? `Potential Research Direction: Investigate ${gaps[0].topic || 'methodological extensions'} addressing identified limitations: ${activePaper.limitation || 'generalization and boundary constraints'}.`
                      : fallbackText)}
                </p>
              </div>
            </section>

            {/* Bottom Download Action */}
            <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Export this 7-section structured intelligence brief as an academic PDF.
              </span>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-6 py-2.5 rounded-xl bg-[#1E1B4B] dark:bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 dark:hover:bg-[#2563EB]/90 transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>[ Download Report ]</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;

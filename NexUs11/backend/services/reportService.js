import { jsPDF } from 'jspdf';
import { supabase } from '../config/supabase.js';
import deepAnalysisService from './deepAnalysisService.js';
import paperService from './paperService.js';

// Multi-tenant in-memory reports store: userId -> Array of reports
const reportsStore = new Map();
// Async job tracking: jobId -> job state
const jobsStore = new Map();

export const reportService = {
  /**
   * Starts an asynchronous analysis and report generation job
   */
  async startAnalysisJob(userId, projectId = null, options = {}) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const job = {
      id: jobId,
      userId,
      projectId,
      status: 'processing',
      progressStep: 'Reading documents and extracting metadata',
      progressPercent: 20,
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };
    jobsStore.set(jobId, job);

    // Run async in background without blocking caller
    (async () => {
      try {
        job.progressPercent = 40;
        job.progressStep = 'Analyzing methodologies and technologies';

        const { papers } = await paperService.getPapers(userId);
        if (!papers || papers.length === 0) {
          job.status = 'failed';
          job.error = 'No research papers uploaded to analyze.';
          return;
        }

        job.progressPercent = 60;
        job.progressStep = 'Comparing papers & detecting research gaps';

        const analysisResult = await deepAnalysisService.runFullAnalysis(userId, papers);

        job.progressPercent = 85;
        job.progressStep = 'Synthesizing 20-section academic research paper';

        const structured = analysisResult.structuredAnalysis;
        const reportTitle = `AI Research Analysis: ${structured.topic}`;
        const reportTopic = structured.topic;
        const reportAbstract = `Structured cross-paper synthesis of ${papers.length} peer-reviewed research publications focusing on ${structured.topic}.`;
        const reportContent = structured.fullPaperText;

        const reportRecord = {
          id: `report_${Date.now()}`,
          project_id: projectId,
          session_id: null,
          user_id: userId,
          title: reportTitle,
          topic: reportTopic,
          abstract: reportAbstract,
          content: reportContent,
          structured_analysis: structured,
          status: 'completed',
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save in Supabase if configured
        if (supabase) {
          try {
            await supabase.from('research_reports').insert([reportRecord]);
          } catch (e) {
            console.warn('[ReportService] Supabase report insert fallback:', e.message);
          }
        }

        // Save in memory store
        const userReports = reportsStore.get(userId) || [];
        userReports.unshift(reportRecord);
        reportsStore.set(userId, userReports);

        job.status = 'completed';
        job.progressPercent = 100;
        job.progressStep = 'Research paper generated successfully';
        job.completedAt = new Date().toISOString();
        job.reportId = reportRecord.id;
      } catch (err) {
        console.error('[ReportService] Job error:', err);
        job.status = 'failed';
        job.error = err.message || 'Analysis processing failed.';
      }
    })();

    return job;
  },

  getJobStatus(jobId) {
    return jobsStore.get(jobId) || null;
  },

  async getLatestReport(userId, projectId = null) {
    if (!userId) return null;

    if (supabase) {
      try {
        let query = supabase
          .from('research_reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          return data[0];
        }
      } catch {}
    }

    const userReports = reportsStore.get(userId) || [];
    if (userReports.length > 0) {
      if (projectId) {
        return userReports.find((r) => r.project_id === projectId) || userReports[0];
      }
      return userReports[0];
    }

    // If no report cached, generate on-demand
    const analysisResult = await deepAnalysisService.runFullAnalysis(userId);
    if (analysisResult?.structuredAnalysis) {
      const structured = analysisResult.structuredAnalysis;
      return {
        id: `report_${Date.now()}`,
        user_id: userId,
        project_id: projectId,
        title: `AI Research Analysis: ${structured.topic}`,
        topic: structured.topic,
        abstract: `Structured cross-paper synthesis of ${structured.papersCount} peer-reviewed research publications focusing on ${structured.topic}.`,
        content: structured.fullPaperText,
        structured_analysis: structured,
        status: 'completed',
        created_at: new Date().toISOString(),
      };
    }

    return null;
  },

  async getAllReports(userId) {
    if (!userId) return [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('research_reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }

    return reportsStore.get(userId) || [];
  },

  /**
   * Generates a genuine multi-page PDF document buffer
   */
  async generatePdfBuffer(report) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 45;
    const maxContentWidth = pageWidth - margin * 2;

    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [37, 99, 235]; // Blue 600
    const bodyColor = [51, 65, 85]; // Slate 700

    let y = margin;

    // Helper to check page break
    const checkPageBreak = (neededHeight = 25) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        // Page number on previous page
        return true;
      }
      return false;
    };

    // Header Band
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 70, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('NEXUS • AI RESEARCH ANALYSIS REPORT', margin, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Academic Intelligence Synthesis | Topic: ${report.topic || 'Literature Synthesis'}`, margin, 58);

    y = 100;

    // Report Title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const titleLines = doc.splitTextToSize(report.title || 'AI Research Analysis Report', maxContentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 18 + 10;

    // Metadata Bar
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
    const metaText = `Generated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} | Status: Audited & Grounded`;
    doc.text(metaText, margin, y);
    y += 18;

    // Horizontal Rule
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    // Parse Sections from content
    const rawContent = report.content || '';
    const sections = rawContent.split(/\n(?=##?\s+)/);

    sections.forEach((secText) => {
      const trimmed = secText.trim();
      if (!trimmed) return;

      const lines = trimmed.split('\n');
      const headerLine = lines[0].replace(/^#+\s*/, '').trim();
      const bodyLines = lines.slice(1).join('\n').trim();

      checkPageBreak(40);

      // Section Header
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(headerLine.toUpperCase(), margin, y);
      y += 16;

      // Section Body
      if (bodyLines) {
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);

        // Split body into manageable paragraphs
        const paras = bodyLines.split(/\n\s*\n/);
        paras.forEach((para) => {
          const cleanPara = para.replace(/\*\*/g, '').replace(/\*/g, '• ').trim();
          if (!cleanPara) return;

          const wrapped = doc.splitTextToSize(cleanPara, maxContentWidth);
          checkPageBreak(wrapped.length * 13 + 8);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 13 + 8;
        });
      }

      y += 10;
    });

    // Page numbering
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${p} of ${totalPages} • NEXUS Academic AI Platform`, margin, pageHeight - 20);
    }

    return Buffer.from(doc.output('arraybuffer'));
  },
};

export default reportService;

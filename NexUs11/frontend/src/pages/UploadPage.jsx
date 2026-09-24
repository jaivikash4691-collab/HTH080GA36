import React, { useState, useRef } from 'react';
import { useResearch } from '../context/ResearchContext';
import {
  FileUp,
  FileText,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  FileCheck2,
  Sparkles,
  Search,
} from 'lucide-react';
import { EvidenceStrengthBadge } from '../components/EvidenceStrengthBadge';

export const UploadPage = ({ onStartAnalysis, onDiscover }) => {
  const { papers, addPaper, removePaper } = useResearch();
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setValidationError('');

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e) => {
    setValidationError('');
    const files = Array.from(e.target.files);
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = (files) => {
    if (!files || files.length === 0) return;

    // Removed the 8 paper limit restriction as requested.

    const validExtensions = ['.pdf', '.doc', '.docx'];

    files.forEach((file) => {
      const lower = file.name.toLowerCase();
      const hasValidExt = validExtensions.some((ext) => lower.endsWith(ext));

      if (!hasValidExt) {
        setValidationError('Invalid format: Only PDF, DOC, and DOCX research documents are supported.');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setValidationError(`Oversized file: "${file.name}" exceeds the 25MB maximum size limit.`);
        return;
      }

      // Duplicate check
      const isDuplicate = papers.some(
        (p) => p.filename.toLowerCase() === file.name.toLowerCase()
      );
      if (isDuplicate) {
        setValidationError(`Duplicate paper warning: "${file.name}" is already staged.`);
        return;
      }

      const nextId = papers.length + 1;
      const ext = lower.endsWith('.docx') ? 'docx' : lower.endsWith('.doc') ? 'doc' : 'pdf';
      const cleanTitle = file.name.replace(/\.(pdf|docx|doc)/i, '').replace(/_/g, ' ');

      const newP = {
        id: 'paper_' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5),
        code: `P${nextId}`,
        filename: file.name,
        title: cleanTitle,
        authors: 'Investigator et al.',
        year: new Date().getFullYear(),
        pages: 12,
        fileFormat: ext,
        status: 'Ready',
        extractionStatus: '100% OCR Indexed',
        method: 'Empirical Methodology',
        dataset: 'Evaluated Benchmark',
        mainResult: 'Document indexed for literature intelligence synthesis.',
        limitation: 'Awaiting multi-paper comparative verification.',
      };

      addPaper(newP);
    });
  };

  const canAnalyze = papers.length >= 1;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full">
              STAGE 01
            </span>
            <EvidenceStrengthBadge strength="SUPPORTED" size="sm" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight mt-2">
            Upload Research Literature
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Stage scientific papers (PDF, DOC, DOCX) for comparative multi-paper intelligence.
          </p>
        </div>

        {onDiscover && (
          <button
            type="button"
            onClick={onDiscover}
            className="px-4 py-2 rounded-xl bg-white border border-[#0D9488] text-[#0D9488] text-xs font-bold hover:bg-teal-50/50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Discover Papers Online</span>
          </button>
        )}
      </div>

      {/* Validation Error Toast */}
      {validationError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{validationError}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden ${
          isDragOver
            ? 'border-[#1E1B4B] bg-[#1E1B4B]/5 scale-[1.01]'
            : 'border-[#CBD5E1] bg-white hover:border-[#1E1B4B] hover:bg-slate-50/50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1E1B4B]/10 text-[#1E1B4B] flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
            <FileUp className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-[#1E1B4B]">
              Drop research PDFs or DOCX here
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              or browse from your local device
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-[11px] font-semibold text-[#64748B]">
            <FileCheck2 className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Supported: .PDF, .DOC, .DOCX</span>
          </div>
        </div>
      </div>

      {/* Staged Papers List */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1E1B4B]" />
            <h3 className="text-sm font-bold text-[#1E1B4B]">
              Papers Uploaded ({papers.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E2E8F0] text-[#1E1B4B] hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More</span>
            </button>
          </div>
        </div>

        {papers.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B] space-y-2">
            <p className="font-semibold text-sm text-[#1E1B4B]">No papers uploaded yet.</p>
            <p>Drag and drop your academic PDFs above or browse from your device.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {papers.map((paper, idx) => (
              <div
                key={paper.id || idx}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1E1B4B] truncate">
                      {paper.title || paper.filename}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {paper.pages || 1} pages • <span className="text-[#0D9488] font-semibold">{paper.code || `P${idx + 1}`}</span> • Indexed
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-bold text-[#0D9488] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Ready
                  </span>

                  <button
                    type="button"
                    onClick={() => removePaper(paper.id)}
                    className="p-1.5 text-slate-400 hover:text-[#E11D48] transition-colors rounded-md hover:bg-rose-50 cursor-pointer"
                    title="Remove paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#64748B]">
            {papers.length > 0
              ? 'Ready for cross-paper meta-analysis and gap discovery'
              : 'Upload at least 1 research paper to run analysis'}
          </div>

          <button
            type="button"
            disabled={!canAnalyze}
            onClick={onStartAnalysis}
            className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
              canAnalyze
                ? 'bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 cursor-pointer active:scale-98'
                : 'bg-[#CBD5E1] text-white cursor-not-allowed'
            }`}
          >
            <span>Run Multi-Paper Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

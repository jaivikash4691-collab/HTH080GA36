import React, { useState } from 'react';
import { Search, ExternalLink, BookOpen, Compass, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const PaperDiscoveryPage = ({ onProceedToUpload }) => {
  const [searchQuery, setSearchQuery] = useState('cardiovascular deep learning multi-center generalization');

  const scholarlyEngines = [
    {
      name: 'Google Scholar',
      description: 'Comprehensive cross-disciplinary index of peer-reviewed articles, theses, and books.',
      baseUrl: (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
      badge: 'Cross-Disciplinary',
    },
    {
      name: 'arXiv',
      description: 'Open-access archive for 2+ million preprints in computer science, machine learning, and quantitative biology.',
      baseUrl: (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
      badge: 'Open Preprints',
    },
    {
      name: 'PubMed / NCBI',
      description: 'Biomedical and life sciences journal citations from MEDLINE and National Institutes of Health.',
      baseUrl: (q) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`,
      badge: 'Biomedical & Clinical',
    },
    {
      name: 'Semantic Scholar',
      description: 'AI-backed research discovery platform with automated citation graphs and influential paper links.',
      baseUrl: (q) => `https://www.semanticscholar.org/search?q=${encodeURIComponent(q)}`,
      badge: 'Citation Graphs',
    },
    {
      name: 'IEEE Xplore',
      description: 'Authoritative research repository for electrical engineering, computer science, and bio-engineering.',
      baseUrl: (q) => `https://ieeexplore.ieee.org/search/searchresult.jsp?newsearch=true&queryText=${encodeURIComponent(q)}`,
      badge: 'Engineering & Computing',
    },
    {
      name: 'ACM Digital Library',
      description: 'Premier computing literature archive containing conference proceedings and journals.',
      baseUrl: (q) => `https://dl.acm.org/action/doSearch?AllField=${encodeURIComponent(q)}`,
      badge: 'Computer Science',
    },
    {
      name: 'SpringerLink',
      description: 'Millions of scientific documents across medical informatics, machine intelligence, and biotechnology.',
      baseUrl: (q) => `https://link.springer.com/search?query=${encodeURIComponent(q)}`,
      badge: 'Scientific Books & Journals',
    },
    {
      name: 'ScienceDirect',
      description: 'Elsevier primary research platform covering peer-reviewed clinical medicine and AI healthcare papers.',
      baseUrl: (q) => `https://www.sciencedirect.com/search?qs=${encodeURIComponent(q)}`,
      badge: 'Peer-Reviewed Journals',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
            Scholarly Ingestion Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight mt-1.5">
            Research Paper Discovery
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Search peer-reviewed repositories, download 5–8 PDF/DOC documents, and ingest them into NEXUS.
          </p>
        </div>

        <button
          type="button"
          onClick={onProceedToUpload}
          className="px-5 py-2.5 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Upload Papers to NEXUS</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
          Academic Query Topic
        </label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic, keywords, or medical domain..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B] bg-[#FBF9F5]"
          />
        </div>
      </div>

      {/* Scholarly Platforms Grid (Section 32) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scholarlyEngines.map((engine) => (
          <div
            key={engine.name}
            className="nexus-hover-card p-5 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1E1B4B]">
                  {engine.name}
                </h3>
                <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                  {engine.badge}
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                {engine.description}
              </p>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Opens scholarly portal in new tab</span>
              <a
                href={engine.baseUrl(searchQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF9F5] border border-[#E2E8F0] text-xs font-bold text-[#1E1B4B] hover:bg-[#1E1B4B] hover:text-white transition-all cursor-pointer shadow-2xs"
              >
                <span>Search {engine.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Scholarly Access Notice (Section 32) */}
      <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#64748B] space-y-1">
        <span className="font-bold text-[#1E1B4B] block">Scholarly Open Access & Compliance:</span>
        <p className="leading-relaxed">
          NEXUS respects intellectual property and does not scrape or copy paywalled materials. Researchers can obtain legitimate papers via institutional subscriptions or open repositories (arXiv, PubMed Central), then ingest 5–8 PDF or DOCX files into their private session workspace.
        </p>
      </div>
    </div>
  );
};

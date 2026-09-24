import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, ExternalLink, Table2 } from 'lucide-react';
import { GlobalAIBadge } from './GlobalAIBadge';

export const ComparisonTable = () => {
  const { papers = [], openPaperProfile } = useResearch();
  const [sortField, setSortField] = useState('year');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const paperList = papers || [];

  if (paperList.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-[#1E1B4B] mx-auto flex items-center justify-center">
          <Table2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">No Papers in Matrix</h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          Upload and analyze research papers to generate side-by-side methodology, sample size, evaluation metric, and limitation comparisons.
        </p>
      </div>
    );
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const availableMethods = Array.from(new Set(paperList.map((p) => p.method).filter(Boolean)));

  // Filter papers
  const filteredPapers = paperList.filter((p) => {
    const title = (p.title || '').toLowerCase();
    const code = (p.code || '').toLowerCase();
    const method = (p.method || '').toLowerCase();
    const dataset = (p.dataset || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      title.includes(query) ||
      code.includes(query) ||
      method.includes(query) ||
      dataset.includes(query);

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Sort papers
  const sortedPapers = [...filteredPapers].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'sampleSize') {
      aVal = parseInt(String(aVal || 0).replace(/,/g, ''), 10) || 0;
      bVal = parseInt(String(bVal || 0).replace(/,/g, ''), 10) || 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const columns = [
    { key: 'code', label: 'Paper', sortable: true, sticky: true },
    { key: 'year', label: 'Year', sortable: true },
    { key: 'method', label: 'Method', sortable: true },
    { key: 'dataset', label: 'Dataset', sortable: true },
    { key: 'sampleSize', label: 'Sample Size', sortable: true },
    { key: 'evaluationMetric', label: 'Evaluation Metric', sortable: false },
    { key: 'mainResult', label: 'Main Result', sortable: false },
    { key: 'limitation', label: 'Limitation', sortable: false },
  ];

  return (
    <div className="glass-card overflow-hidden space-y-4 p-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers, methods, datasets..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:border-[#1E1B4B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Method:
          </span>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="py-1.5 px-3 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:border-[#1E1B4B]"
          >
            <option value="all">All Methods ({paperList.length})</option>
            {availableMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Matrix Table with Sticky 1st column */}
      <div className="overflow-x-auto relative rounded-xl border border-[#E2E8F0]">
        <table className="w-full text-left border-collapse min-w-[920px]">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {columns.map((col) => {
                const isActive = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`p-3.5 text-xs font-bold uppercase tracking-wider text-[#0F172A] select-none ${
                      col.sortable ? 'cursor-pointer hover:bg-slate-200/50 transition-colors' : ''
                    } ${isActive ? 'bg-indigo-50/70 text-[#1E1B4B]' : ''} ${
                      col.sticky ? 'sticky left-0 bg-[#F8FAFC] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-[#1E1B4B]">
                          {isActive ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#1E1B4B]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#1E1B4B]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-[#0F172A] text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs">
            {sortedPapers.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-[#64748B]">
                  No papers found matching your search.
                </td>
              </tr>
            ) : (
              sortedPapers.map((paper) => (
                <tr
                  key={paper.id}
                  onClick={() => openPaperProfile(paper)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Sticky Paper column */}
                  <td className="p-3.5 font-bold text-[#1E1B4B] sticky left-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#1E1B4B]/10 text-[#1E1B4B] text-[11px] font-black">
                        {paper.code || 'Study'}
                      </span>
                      <span className="font-semibold text-[#0F172A] max-w-[140px] truncate" title={paper.title}>
                        {paper.title || paper.filename}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-700">{paper.year || 2024}</td>
                  <td className="p-3.5">
                    <span className="font-bold text-[#1E1B4B] bg-slate-100 px-2 py-0.5 rounded">
                      {paper.method || 'Standard Method'}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">{paper.dataset || 'Dataset'}</td>
                  <td className="p-3.5 font-semibold text-[#0F172A]">{paper.sampleSize || '—'}</td>
                  <td className="p-3.5 text-[#64748B]">{paper.evaluationMetric || '—'}</td>
                  <td className="p-3.5 font-bold text-[#0D9488] max-w-[170px] truncate" title={paper.mainResult}>
                    {paper.mainResult || 'Empirical benchmark'}
                  </td>
                  <td className="p-3.5 text-[#D97706] max-w-[180px] truncate font-medium" title={paper.limitation}>
                    {paper.limitation || 'Cohort limitation'}
                  </td>
                  <td className="p-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E1B4B] group-hover:underline">
                      Profile <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

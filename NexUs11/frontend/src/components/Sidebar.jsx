import React from 'react';
import { useResearch } from '../context/ResearchContext';
import {
  LayoutDashboard,
  Search,
  Upload,
  Layers,
  Table2,
  AlertTriangle,
  Lightbulb,
  MessageSquareQuote,
  FileCheck2,
  CheckCircle,
  HelpCircle,
  Compass,
  MessageSquareHeart,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const Sidebar = ({ currentView, onViewChange }) => {
  const { papers, topic, userRoleMode, setUserRoleMode } = useResearch();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'papers_discovery', label: 'Discover Papers', icon: Search },
    { id: 'upload', label: 'Upload Papers', icon: Upload },
    { id: 'analysis', label: 'Analysis Pipeline', icon: Layers },
    { id: 'landscape', label: 'Research Landscape', icon: Compass },
    { id: 'comparison', label: 'Comparison Matrix', icon: Table2 },
    { id: 'findings', label: 'Common Findings', icon: CheckCircle },
    { id: 'contradictions', label: 'Contradiction Hunter', icon: AlertTriangle },
    { id: 'gaps', label: 'Research Gap Radar', icon: HelpCircle },
    { id: 'ask', label: 'Ask NEXUS (Analyzer)', icon: MessageSquareQuote },
    { id: 'strategy', label: 'Research Strategy', icon: Lightbulb },
    { id: 'report', label: 'Academic Report', icon: FileCheck2 },
    { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-5">
        {/* Student Mode vs Expert Mode Switcher (Section 26 & 27) */}
        <div className="p-2.5 rounded-xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#2563EB]" />
              Synthesis Depth
            </span>
            <span className="text-[#2563EB] uppercase">{userRoleMode}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-200/60 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setUserRoleMode('student')}
              className={`py-1 rounded-md transition-all cursor-pointer ${
                userRoleMode === 'student' ? 'bg-white text-[#1E1B4B] shadow-2xs' : 'text-[#64748B]'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setUserRoleMode('expert')}
              className={`py-1 rounded-md transition-all cursor-pointer ${
                userRoleMode === 'expert' ? 'bg-white text-[#1E1B4B] shadow-2xs' : 'text-[#64748B]'
              }`}
            >
              Expert
            </button>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-[#64748B]">
            Research Intelligence Modules
          </div>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1E1B4B] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom of Sidebar: Stats Box */}
      <div className="p-3.5 rounded-2xl bg-[#FBF9F5] border border-[#E2E8F0] space-y-2 mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#64748B] font-medium">Papers Staged:</span>
          <span className="font-extrabold text-[#1E1B4B]">{papers.length}/8</span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#1E1B4B] rounded-full"
            style={{ width: `${Math.min((papers.length / 8) * 100, 100)}%` }}
          />
        </div>

        <div className="pt-1">
          <span className="text-[10px] text-[#64748B] font-bold block uppercase tracking-wider">
            Active Topic
          </span>
          <span className="text-xs font-bold text-[#1E1B4B] line-clamp-1" title={topic}>
            {topic}
          </span>
        </div>
      </div>
    </aside>
  );
};

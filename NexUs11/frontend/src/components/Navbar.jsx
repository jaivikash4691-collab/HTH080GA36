import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LogOut, User, BookOpen, Layers, Menu, X, Compass, ChevronDown, Table2, AlertTriangle, FileCheck2, HelpCircle } from 'lucide-react';

export const Navbar = ({ currentView, onViewChange, onOpenAuth }) => {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [researchDropdownOpen, setResearchDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Section 6: Exact Navigation items
  const mainNav = [
    { id: 'landing', label: 'Home' },
    { id: 'papers_discovery', label: 'Papers' },
    { id: 'ask', label: 'Analyzer' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-xs border-b border-[#E2E8F0]'
          : 'bg-white/95 border-b border-[#E2E8F0]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Wordmark */}
        <div
          onClick={() => onViewChange('landing')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1E1B4B] text-white flex items-center justify-center font-black text-lg tracking-wider shadow-sm group-hover:scale-105 transition-transform">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-[#1E1B4B] leading-none">
              NEXUS
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#64748B] uppercase">
              Research Intelligence
            </span>
          </div>
        </div>

        {/* Center/Right Desktop Navigation (Section 6) */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {/* Home */}
          <button
            type="button"
            onClick={() => onViewChange('landing')}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'landing' ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]' : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            Home
          </button>

          {/* Papers */}
          <button
            type="button"
            onClick={() => onViewChange('papers_discovery')}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'papers_discovery' || currentView === 'upload' ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]' : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            Papers
          </button>

          {/* Analyzer */}
          <button
            type="button"
            onClick={() => onViewChange('ask')}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'ask' || currentView === 'analysis' ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]' : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            Analyzer
          </button>

          {/* Dashboard */}
          <button
            type="button"
            onClick={() => onViewChange('dashboard')}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'dashboard' ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]' : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            Dashboard
          </button>

          {/* Research Dropdown (Deals with Deep Modules: Landscape, Comparison, Contradictions, Gaps) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setResearchDropdownOpen(!researchDropdownOpen)}
              className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                ['landscape', 'comparison', 'findings', 'contradictions', 'gaps'].includes(currentView)
                  ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]'
                  : 'text-[#64748B] hover:text-[#1E1B4B]'
              }`}
            >
              <span>Research</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {researchDropdownOpen && (
              <div
                onMouseLeave={() => setResearchDropdownOpen(false)}
                className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-2 z-50 animate-fade-in-up"
              >
                <button
                  type="button"
                  onClick={() => { setResearchDropdownOpen(false); onViewChange('landscape'); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                >
                  <Compass className="w-4 h-4 text-[#2563EB]" />
                  <span>Research Landscape & Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setResearchDropdownOpen(false); onViewChange('comparison'); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                >
                  <Table2 className="w-4 h-4 text-[#0D9488]" />
                  <span>Comparison Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setResearchDropdownOpen(false); onViewChange('contradictions'); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
                  <span>Contradiction Hunter</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setResearchDropdownOpen(false); onViewChange('gaps'); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-[#D97706]" />
                  <span>Research Gap Radar</span>
                </button>
              </div>
            )}
          </div>

          {/* Strategy */}
          <button
            type="button"
            onClick={() => onViewChange('strategy')}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'strategy' ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]' : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            Strategy
          </button>

          {/* Feedback */}
          <button
            type="button"
            onClick={() => onViewChange('feedback')}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'feedback' ? 'bg-[#1E1B4B]/10 text-[#1E1B4B]' : 'text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            Feedback
          </button>
        </div>

        {/* Right Auth / Avatar Area */}
        <div className="hidden md:flex items-center gap-3">
          {!user ? (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="text-xs font-bold text-[#1E1B4B] hover:opacity-80 transition-opacity cursor-pointer px-3 py-2"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Get Started
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#1E1B4B] text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {user.initials || user.name?.substring(0, 2).toUpperCase() || 'NX'}
                </div>
                <span className="text-xs font-bold text-[#0F172A] max-w-[120px] truncate hidden lg:inline">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {userDropdownOpen && (
                <div
                  onMouseLeave={() => setUserDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-2 z-50 animate-fade-in-up"
                >
                  <div className="px-3.5 py-2 border-b border-[#E2E8F0]">
                    <div className="text-xs font-bold text-[#0F172A] truncate">{user.name}</div>
                    <div className="text-[11px] text-[#64748B] truncate">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setUserDropdownOpen(false); onViewChange('dashboard'); }}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#0F172A] hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Research Workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserDropdownOpen(false); logout(); onViewChange('landing'); }}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#E11D48] hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white p-4 space-y-2 animate-fade-in-up">
          {mainNav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setMobileMenuOpen(false); onViewChange(item.id); }}
              className="w-full text-left py-2 px-3 text-xs font-bold text-[#1E1B4B] hover:bg-slate-50 rounded-lg"
            >
              {item.label}
            </button>
          ))}
          {!user ? (
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('login'); }}
                className="w-full py-2.5 text-xs font-bold text-center rounded-lg border border-[#E2E8F0]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('register'); }}
                className="w-full py-2.5 text-xs font-bold text-center rounded-lg bg-[#1E1B4B] text-white"
              >
                Get Started
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); logout(); onViewChange('landing'); }}
              className="w-full text-left py-2 px-3 text-xs font-bold text-[#E11D48] hover:bg-rose-50 rounded-lg"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
};

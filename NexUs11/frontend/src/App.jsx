import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ResearchProvider, useResearch } from './context/ResearchContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { EvidencePanel } from './components/EvidencePanel';
import { PaperProfileModal } from './components/PaperProfileModal';
import { ValidateGapModal } from './components/ValidateGapModal';
import { JudgeTourBanner } from './components/JudgeTourBanner';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { PaperDiscoveryPage } from './pages/PaperDiscoveryPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { LandscapePage } from './pages/LandscapePage';
import { ComparisonPage } from './pages/ComparisonPage';
import { FindingsPage } from './pages/FindingsPage';
import { ContradictionsPage } from './pages/ContradictionsPage';
import { GapsPage } from './pages/GapsPage';
import { AskPage } from './pages/AskPage';
import { StrategyPage } from './pages/StrategyPage';
import { ReportPage } from './pages/ReportPage';
import { FeedbackPage } from './pages/FeedbackPage';

function NexusApp() {
  const { user, setAuthMode } = useAuth();
  const { runAnalysis } = useResearch();

  // Primary active view state
  const [currentView, setCurrentView] = useState(() => {
    return user ? 'dashboard' : 'landing';
  });

  // View navigation handler with route protection (Section 3.5)
  const handleNavigate = (view, targetAnchor = null) => {
    // Public views that don't force auth redirect
    const publicViews = ['landing', 'auth', 'papers_discovery', 'feedback'];
    if (!publicViews.includes(view) && !user) {
      setAuthMode('login');
      setCurrentView('auth');
      return;
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetAnchor) {
      setTimeout(() => {
        const el = document.getElementById(targetAnchor);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setCurrentView('auth');
  };

  const handleStartResearch = () => {
    if (user) {
      setCurrentView('upload');
    } else {
      setAuthMode('login');
      setCurrentView('auth');
    }
  };

  const handleStartAnalysis = () => {
    runAnalysis();
    setCurrentView('analysis');
  };

  const isPublicPage = currentView === 'landing' || currentView === 'auth';

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1E1B4B] flex flex-col font-sans selection:bg-[#1E1B4B] selection:text-white">
      {/* 4.1 Persistent Sticky Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col">
        {isPublicPage ? (
          // Landing and Auth Full Width Container
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentView === 'landing' && (
              <LandingPage
                onStartResearch={handleStartResearch}
                onOpenAuth={handleOpenAuth}
                onNavigate={handleNavigate}
              />
            )}
            {currentView === 'auth' && (
              <AuthPage
                onAuthSuccess={() => setCurrentView('dashboard')}
                onBackToLanding={() => setCurrentView('landing')}
              />
            )}
          </main>
        ) : (
          // Authenticated Workspace Layout with Persistent Sidebar (Section 5)
          <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto">
            <Sidebar
              currentView={currentView}
              onViewChange={handleNavigate}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {currentView === 'dashboard' && (
                <DashboardPage onNavigate={handleNavigate} />
              )}
              {currentView === 'papers_discovery' && (
                <PaperDiscoveryPage onProceedToUpload={() => handleNavigate('upload')} />
              )}
              {currentView === 'upload' && (
                <UploadPage
                  onStartAnalysis={handleStartAnalysis}
                  onDiscover={() => handleNavigate('papers_discovery')}
                />
              )}
              {currentView === 'analysis' && (
                <AnalysisPage
                  onViewLandscape={() => handleNavigate('landscape')}
                />
              )}
              {currentView === 'landscape' && (
                <LandscapePage onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate} />
              )}
              {currentView === 'comparison' && (
                <ComparisonPage onNavigate={handleNavigate} />
              )}
              {currentView === 'findings' && (
                <FindingsPage onNavigate={handleNavigate} />
              )}
              {currentView === 'contradictions' && (
                <ContradictionsPage onNavigate={handleNavigate} />
              )}
              {currentView === 'gaps' && (
                <GapsPage onNavigate={handleNavigate} />
              )}
              {currentView === 'ask' && (
                <AskPage />
              )}
              {currentView === 'strategy' && (
                <StrategyPage onNavigate={handleNavigate} />
              )}
              {currentView === 'report' && (
                <ReportPage />
              )}
              {currentView === 'feedback' && (
                <FeedbackPage />
              )}
            </main>
          </div>
        )}
      </div>

      {/* Slide-Over Global Evidence Drawer (Section 18) */}
      <EvidencePanel />

      {/* Detailed Paper Profile Modal (Section 11) */}
      <PaperProfileModal />

      {/* Signature Feature: Validate Gap Modal (Section 11) */}
      <ValidateGapModal />

      {/* 30-Second Hackathon Judge Tour Bar (Section 21 & 51) */}
      <JudgeTourBanner
        currentView={currentView}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ResearchProvider>
        <NexusApp />
      </ResearchProvider>
    </AuthProvider>
  );
}

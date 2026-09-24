import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import JudgeTourBanner from '../components/JudgeTourBanner';

export default function MainLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#0F172A] flex flex-col font-sans">
      <JudgeTourBanner setActiveTab={setActiveTab} />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

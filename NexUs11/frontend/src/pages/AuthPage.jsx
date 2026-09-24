import React from 'react';
import { AuthCard } from '../components/AuthCard';
import { ArrowLeft } from 'lucide-react';

export const AuthPage = ({ onAuthSuccess, onBackToLanding }) => {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
      {/* Background Soft Indigo Gradient Backdrop (Section 3.2) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#1E1B4B]/5 via-[#4F46E5]/5 to-transparent pointer-events-none" />

      {/* Back button */}
      <div className="w-full max-w-md mb-4 z-10">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Homepage</span>
        </button>
      </div>

      <div className="w-full relative z-10">
        <AuthCard onSuccess={onAuthSuccess} />
      </div>
    </div>
  );
};

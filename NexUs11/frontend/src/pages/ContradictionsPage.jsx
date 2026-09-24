import React from 'react';
import { ContradictionHunterView } from '../components/ContradictionHunterView';
import { ArrowRight, HelpCircle } from 'lucide-react';

export const ContradictionsPage = ({ onNavigate }) => {
  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      <ContradictionHunterView />

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => onNavigate('gaps')}
          className="px-5 py-2.5 rounded-xl bg-[#1E1B4B] text-white text-xs font-bold hover:bg-[#1E1B4B]/90 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#D97706]" />
          <span>Proceed to Research Gap Radar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

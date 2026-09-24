import React, { useState } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Star, Send, CheckCircle2, MessageSquareHeart, ShieldCheck } from 'lucide-react';

export const FeedbackPage = () => {
  const { submitFeedback, feedbackList } = useResearch();
  const [rating, setRating] = useState(5);
  const [whatLiked, setWhatLiked] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitFeedback({
      rating,
      whatLiked,
      whatCouldImprove,
      suggestions,
    });
    setSubmitted(true);
    setWhatLiked('');
    setWhatCouldImprove('');
    setSuggestions('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full">
          Platform Evolution
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight mt-1.5">
          Researcher Feedback
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Help calibrate the NEXUS research intelligence engine, contradiction filters, and synthesis accuracy.
        </p>
      </div>

      {submitted && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#0D9488] flex items-center gap-2.5 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0" />
          <span className="font-bold">Thank you! Your feedback has been recorded into the research database.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-6">
        {/* Star Rating */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-2">
            Overall Research Intelligence Rating
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 transition-all ${
                    star <= rating
                      ? 'fill-[#D97706] text-[#D97706] scale-110'
                      : 'text-slate-300 hover:text-slate-400'
                  }`}
                />
              </button>
            ))}
            <span className="ml-3 text-xs font-bold text-[#1E1B4B]">
              {rating} / 5 Stars
            </span>
          </div>
        </div>

        {/* What did you like? */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
            What did you like about NEXUS?
          </label>
          <textarea
            required
            rows={3}
            value={whatLiked}
            onChange={(e) => setWhatLiked(e.target.value)}
            placeholder="e.g. The Contradiction Hunter and Evidence Lineage made it easy to pinpoint scanner variance..."
            className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B] bg-[#FBF9F5]"
          />
        </div>

        {/* What could improve? */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
            What could improve?
          </label>
          <textarea
            rows={3}
            value={whatCouldImprove}
            onChange={(e) => setWhatCouldImprove(e.target.value)}
            placeholder="e.g. Add more granularity to the temporal drift timeline..."
            className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B] bg-[#FBF9F5]"
          />
        </div>

        {/* Optional suggestions */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">
            Optional Suggestions / Feature Requests
          </label>
          <textarea
            rows={2}
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            placeholder="e.g. Direct BibTeX citation export..."
            className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B] bg-[#FBF9F5]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-[#1E1B4B] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1E1B4B]/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Send className="w-4 h-4" />
          <span>Submit Research Feedback</span>
        </button>
      </form>
    </div>
  );
};

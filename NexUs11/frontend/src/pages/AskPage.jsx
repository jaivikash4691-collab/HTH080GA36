import React, { useState, useRef, useEffect } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Send, MessageSquareQuote, ShieldCheck, BookOpen, Layers } from 'lucide-react';

export const AskPage = () => {
  const { chatMessages, askQuestion, isAiTyping, papers } = useResearch();
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    askQuestion(inputText);
    setInputText('');
  };

  const handleActionClick = (query) => {
    askQuestion(query);
  };

  const dynamicQuickActions =
    papers.length > 0
      ? [
          { label: 'Compare Methodologies', query: 'Compare the methodologies across my uploaded papers.' },
          { label: 'Evaluation Datasets', query: 'What datasets are used across my uploaded papers?' },
          { label: 'Documented Limitations', query: 'What are the primary limitations documented in these papers?' },
          { label: 'Implemented Technologies', query: 'What frontend, backend, and databases are used?' },
        ]
      : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
              Closed-Context Research Engine • Zero Hallucination
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
            Research Chatbot & Analyzer
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Ask precise questions about your uploaded papers. Answers are strictly grounded in your documents.
          </p>
        </div>

        <div className="text-xs text-[#64748B] font-semibold bg-slate-100 px-3 py-1.5 rounded-xl">
          {papers.length} Papers Active
        </div>
      </div>

      {/* Zero Hallucination Closed-Context Status Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-black">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block text-[11px] uppercase tracking-wider text-slate-200">
              Closed-Context Mode Active
            </span>
            <span className="text-slate-400 text-[11px]">
              Answers derive exclusively from uploaded paper texts. Unsupported facts or out-of-scope queries are rejected.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
          Strict Research Grounding
        </span>
      </div>

      {/* Quick-Action Inquiries */}
      {dynamicQuickActions.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] block">
            Suggested Research Inquiries
          </span>
          <div className="flex flex-wrap gap-2">
            {dynamicQuickActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleActionClick(action.query)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#1E1B4B] hover:border-[#1E1B4B] hover:bg-[#FBF9F5] transition-all cursor-pointer shadow-2xs"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="glass-card min-h-[440px] max-h-[580px] p-6 flex flex-col justify-between overflow-hidden bg-white rounded-2xl border border-[#E2E8F0]">
        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
          {chatMessages.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
                <MessageSquareQuote className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#1E1B4B]">No questions asked yet</h4>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                {papers.length > 0
                  ? 'Ask a question about your uploaded research papers. Responses will be grounded strictly in your documents.'
                  : 'Upload 5-8 research papers in the Upload tab to begin asking questions.'}
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in-up`}
                >
                  {isUser ? (
                    <div className="max-w-[85%] sm:max-w-[70%] bg-[#1E1B4B] text-white p-4 rounded-2xl rounded-tr-xs shadow-sm space-y-1">
                      <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                      <span className="text-[10px] text-slate-300 block text-right">
                        {msg.timestamp}
                      </span>
                    </div>
                  ) : (
                    <div className="max-w-[90%] sm:max-w-[80%] bg-[#FBF9F5] border border-[#E2E8F0] p-5 rounded-2xl rounded-tl-xs shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#1E1B4B] text-white flex items-center justify-center font-black text-xs">
                            N
                          </div>
                          <span className="text-xs font-bold text-[#1E1B4B]">NEXUS Research Analyzer</span>
                        </div>
                        <span className="text-[10px] text-[#64748B] font-semibold">{msg.timestamp}</span>
                      </div>

                      <div className="text-xs text-[#0F172A] leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.text}
                      </div>

                      {/* Paper Citations (Strict Source Attribution) */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                          <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">
                            Referenced Research Excerpts
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((c, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[#1E1B4B]"
                              >
                                {c.code || c.title || `Paper ${i + 1}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isAiTyping && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] p-3 bg-slate-50 rounded-xl max-w-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#1E1B4B] animate-ping" />
              <span>Analyzing uploaded research papers...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 pt-3 border-t border-[#E2E8F0]">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              papers.length > 0
                ? "Ask a question about your uploaded research papers (e.g., 'What methodology does Paper 1 use?')..."
                : 'Please upload research papers to begin querying...'
            }
            disabled={papers.length === 0}
            className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#1E1B4B] focus:bg-white transition-all disabled:opacity-50 text-[#0F172A]"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || papers.length === 0}
            className="p-3 rounded-xl bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AskPage;

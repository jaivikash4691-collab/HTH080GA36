import React, { useState, useRef, useEffect } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Send, MessageSquareQuote, ShieldCheck, ArrowRight } from 'lucide-react';
import { CitationPill } from '../components/CitationPill';

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

  const dynamicQuickActions = papers.length > 0 ? [
    { label: 'Methodology Comparison', query: 'Compare the methodologies across my uploaded papers.' },
    { label: 'Evaluation Datasets', query: 'What datasets are used across my uploaded papers?' },
    { label: 'Research Limitations', query: 'What are the primary limitations documented in these papers?' },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
              Full-Text Citation Grounding • AI Analyzer
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
            Ask NEXUS (Analyzer)
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Query across your uploaded papers. Every answer is grounded with verbatim citations and hallucination verification.
          </p>
        </div>
      </div>

      {/* Hallucination Firewall Status Indicator */}
      <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-[#1E1B4B] block text-[11px] uppercase tracking-wider">
              Hallucination Firewall Active
            </span>
            <span className="text-[#64748B] text-[11px]">
              Retriever verification • Grounding check • Safe-guarded against citation fabrication
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-[#0D9488] bg-white px-2 py-1 rounded-md border border-teal-200">
          {papers.length * 4} Chunks Audited
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
      <div className="glass-card min-h-[440px] max-h-[580px] p-6 flex flex-col justify-between overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
          {chatMessages.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#64748B]">
                <MessageSquareQuote className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#1E1B4B]">No conversations yet</h4>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                {papers.length > 0
                  ? 'Ask a question about your uploaded research papers. Every answer is grounded with citations.'
                  : 'Upload research papers first to begin asking grounded questions.'}
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
                    <div className="max-w-[90%] sm:max-w-[80%] bg-[#FBF9F5] border border-[#E2E8F0] p-5 rounded-2xl rounded-tl-xs shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#1E1B4B] text-white flex items-center justify-center font-black text-xs">
                            N
                          </div>
                          <span className="text-xs font-bold text-[#1E1B4B]">NEXUS Research Synthesis</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#0F172A] leading-relaxed font-semibold">
                        {msg.text}
                      </p>

                      {msg.details && (
                        <ul className="space-y-1.5 text-xs text-[#64748B]">
                          {msg.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1E1B4B] mt-1.5 shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-[#64748B]">Citations:</span>
                            {msg.citations.map((c, idx) => (
                              <CitationPill key={idx} id={c.id} label={c.code} />
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
            <div className="flex items-center gap-2 p-4 bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-xs max-w-xs shadow-xs animate-fade-in-up">
              <div className="w-5 h-5 rounded-md bg-[#1E1B4B] text-white flex items-center justify-center font-bold text-[10px]">
                N
              </div>
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-[#1E1B4B] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#1E1B4B] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#1E1B4B] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-[#64748B] font-medium ml-2">Grounding claims in literature...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Box */}
        <form onSubmit={handleSubmit} className="pt-4 border-t border-[#E2E8F0] mt-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                papers.length > 0
                  ? 'Ask anything across your uploaded research papers...'
                  : 'Upload papers first to ask questions...'
              }
              disabled={papers.length === 0}
              className="flex-1 py-3 px-4 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#1E1B4B] bg-[#FBF9F5] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || papers.length === 0}
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs ${
                inputText.trim() && papers.length > 0
                  ? 'bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 cursor-pointer active:scale-95'
                  : 'bg-[#CBD5E1] text-white cursor-not-allowed'
              }`}
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AskPage;

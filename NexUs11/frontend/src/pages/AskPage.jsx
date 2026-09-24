import React, { useState, useRef, useEffect } from 'react';
import { useResearch } from '../context/ResearchContext';
import { Send, MessageSquareQuote, ShieldCheck, Search, Plus, Check, ExternalLink, BookOpen } from 'lucide-react';
import api from '../services/api';

export const AskPage = () => {
  const { chatMessages, setChatMessages, askQuestion, isAiTyping, setIsAiTyping, papers, addPaper } = useResearch();
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef(null);
  const [addedPapers, setAddedPapers] = useState(new Set());
  
  // Use exact requested state name: chatMode
  const [chatMode, setChatMode] = useState(papers.length === 0 ? 'discovery' : 'analysis');

  // Sync mode when papers change (if 0 papers, force discovery; if 1+, user can still switch but let's default to analysis if they just uploaded)
  useEffect(() => {
    if (papers.length === 0) setChatMode('discovery');
  }, [papers.length]);

  const isDiscoveryMode = chatMode === 'discovery';

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    setInputText('');

    if (isDiscoveryMode) {
      handleDiscovery(query);
    } else {
      askQuestion(query);
    }
  };

  const handleDiscovery = async (query) => {
    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    try {
      const res = await api.post('/research/discover', { query });
      const data = res.data || res;
      
      const results = data.results || [];
      
      if (results.length === 0) {
        setChatMessages((prev) => [...prev, {
            id: 'msg-' + Date.now(),
            sender: 'ai',
            text: "No relevant papers were found. Try a broader or more specific research question.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setChatMessages((prev) => [...prev, {
            id: 'msg-' + Date.now(),
            sender: 'ai',
            text: `I found ${results.length} research papers related to your topic.`,
            results,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, {
          id: 'msg-' + Date.now(),
          sender: 'ai',
          text: "Research discovery is temporarily unavailable. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleActionClick = (query) => {
    if (isDiscoveryMode) {
      handleDiscovery(query);
    } else {
      askQuestion(query);
    }
  };

  const handleAddPaper = async (paper) => {
    if (addedPapers.has(paper.title)) return;
    
    await addPaper({
      title: paper.title,
      authors: paper.authors?.join(', ') || 'Unknown Authors',
      year: paper.year,
      filename: `${paper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30)}.pdf`,
      method: 'Empirical Research',
      dataset: 'Discovered Dataset',
      mainResult: paper.abstract || 'Discovered from academic search.',
      limitation: 'To be analyzed'
    });
    
    setAddedPapers(prev => new Set(prev).add(paper.title));
  };

  const dynamicQuickActions = isDiscoveryMode
    ? [
        { label: 'Find papers about RAG evaluation', query: 'Find papers about RAG evaluation' },
        { label: 'Research transformer models', query: 'Research transformer models' },
        { label: 'Find papers about AI agents', query: 'Find papers about AI agents' },
        { label: 'Research LLM hallucinations', query: 'Research LLM hallucinations' },
        { label: 'Explore multimodal AI research', query: 'Explore multimodal AI research' },
      ]
    : [
        { label: 'Compare Methodologies', query: 'Compare the methodologies across my uploaded papers.' },
        { label: 'Evaluation Datasets', query: 'What datasets are used across my uploaded papers?' },
        { label: 'Documented Limitations', query: 'What are the primary limitations documented in these papers?' },
        { label: 'Implemented Technologies', query: 'What frontend, backend, and databases are used?' },
      ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Mode Switcher - Prominently at the top */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center bg-slate-200 p-1.5 rounded-xl border border-slate-300 shadow-sm">
          <button
            onClick={() => setChatMode('discovery')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              chatMode === 'discovery'
                ? 'bg-white text-[#1E1B4B] shadow-sm' 
                : 'text-[#64748B] hover:text-[#1E1B4B] cursor-pointer'
            }`}
          >
            🔎 Discover Research
          </button>
          <button
            onClick={() => setChatMode('analysis')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              chatMode === 'analysis'
                ? 'bg-white text-[#1E1B4B] shadow-sm' 
                : 'text-[#64748B] hover:text-[#1E1B4B] cursor-pointer'
            }`}
          >
            📚 Analyze My Papers
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full">
              {isDiscoveryMode ? 'Academic Search • Research Discovery' : 'Closed-Context Research Engine • Zero Hallucination'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
            {isDiscoveryMode ? 'Research Chatbot & Discovery' : 'Research Chatbot & Analyzer'}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {isDiscoveryMode 
              ? 'Start with a research topic, question, or idea. Discover relevant academic research and build your workspace.'
              : 'Ask precise questions about your uploaded papers. Answers are strictly grounded in your documents.'
            }
          </p>
        </div>

        <div className="text-xs text-[#64748B] font-semibold bg-slate-100 px-3 py-1.5 rounded-xl">
          {papers.length} {papers.length === 1 ? 'Paper Active' : 'Papers Active'}
        </div>
      </div>

      {/* Dynamic Status Banner */}
      {isDiscoveryMode ? (
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-black">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-[11px] uppercase tracking-wider text-slate-200">
                RESEARCH DISCOVERY MODE
              </span>
              <span className="text-slate-400 text-[11px]">
                No papers are currently in your workspace. Ask NEXUS to discover relevant academic research.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            Global Search
          </span>
        </div>
      ) : (
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
      )}

      {/* Quick-Action Inquiries */}
      {dynamicQuickActions.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] block">
            {isDiscoveryMode ? 'Suggested Research Topics' : 'Suggested Research Inquiries'}
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
              <h4 className="text-sm font-bold text-[#1E1B4B]">
                {isDiscoveryMode ? 'NEXUS Research Discovery' : 'No questions asked yet'}
              </h4>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                {isDiscoveryMode 
                  ? 'Tell me what you want to research. Start with a research question, topic, technology, methodology, or problem.'
                  : 'Ask a question about your uploaded research papers. Responses will be grounded strictly in your documents.'
                }
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
                          <span className="text-xs font-bold text-[#1E1B4B]">NEXUS Research {isDiscoveryMode ? 'Discovery' : 'Analyzer'}</span>
                        </div>
                        <span className="text-[10px] text-[#64748B] font-semibold">{msg.timestamp}</span>
                      </div>

                      <div className="text-xs text-[#0F172A] leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.text}
                      </div>

                      {/* Paper Cards for Discovery Results */}
                      {msg.results && msg.results.length > 0 && (
                        <div className="space-y-3 mt-3">
                          {msg.results.map((paper, idx) => (
                            <div key={idx} className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs space-y-2 relative">
                              <h5 className="text-xs font-bold text-[#1E1B4B] pr-4">{paper.title}</h5>
                              <p className="text-[10px] text-[#64748B] font-medium">
                                {(paper.authors || []).join(' · ')} {paper.authors?.length > 0 && '· '} 
                                {paper.year}
                                {paper.source && ` · ${paper.source}`}
                              </p>
                              {paper.abstract && (
                                <p className="text-[10px] text-[#334155] leading-relaxed line-clamp-3">
                                  {paper.abstract}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                {paper.url && (
                                  <a
                                    href={paper.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] hover:bg-slate-50 transition-colors"
                                  >
                                    Open Paper <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleAddPaper(paper)}
                                  disabled={addedPapers.has(paper.title)}
                                  className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                    addedPapers.has(paper.title)
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                      : 'bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90'
                                  }`}
                                >
                                  {addedPapers.has(paper.title) ? (
                                    <>Added to Workspace <Check className="w-3 h-3" /></>
                                  ) : (
                                    <>Add to Workspace <Plus className="w-3 h-3" /></>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

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
              <span>{isDiscoveryMode ? 'Searching academic literature...' : 'Analyzing uploaded research papers...'}</span>
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
              isDiscoveryMode
                ? "Ask about a research topic or discover academic papers..."
                : "Ask a question about your uploaded research papers (e.g., 'What methodology does Paper 1 use?')..."
            }
            className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#1E1B4B] focus:bg-white transition-all text-[#0F172A]"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
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

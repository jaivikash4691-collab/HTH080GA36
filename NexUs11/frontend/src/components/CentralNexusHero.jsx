import React, { useState, useRef } from 'react';
import { ArrowRight, Compass, Layers, ShieldCheck, Sparkles } from 'lucide-react';

export const CentralNexusHero = ({ onDiscover, onAnalyze }) => {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  // 3D tilt transformation calculations
  const rotateX = -mousePos.y * 14;
  const rotateY = mousePos.x * 18;
  const translateZ = isHovered ? 25 : 0;

  // Connected floating research nodes surrounding the title
  const researchNodes = [
    { id: 1, label: 'Evidence P1', x: '12%', y: '25%', color: '#0D9488', size: 'w-3 h-3' },
    { id: 2, label: 'Methodology CNN', x: '82%', y: '20%', color: '#2563EB', size: 'w-3.5 h-3.5' },
    { id: 3, label: 'Contradiction 12.5%', x: '88%', y: '68%', color: '#E11D48', size: 'w-3 h-3' },
    { id: 4, label: 'Gap Radar', x: '8%', y: '72%', color: '#D97706', size: 'w-3.5 h-3.5' },
    { id: 5, label: 'Transformer Node', x: '50%', y: '12%', color: '#1E1B4B', size: 'w-2.5 h-2.5' },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-5xl mx-auto pt-6 pb-12 sm:pt-10 sm:pb-16 px-4 text-center select-none overflow-hidden"
    >
      {/* Dynamic Background SVG with Reactive Connecting Lines & Nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0">
        <defs>
          <linearGradient id="lineGradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0D9488" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Connecting Lines between nodes and central title area */}
        <line
          x1="14%"
          y1="28%"
          x2={50 + mousePos.x * 20 + '%'}
          y2={50 + mousePos.y * 15 + '%'}
          stroke="url(#lineGradTeal)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <line
          x1="82%"
          y1="22%"
          x2={50 + mousePos.x * 20 + '%'}
          y2={50 + mousePos.y * 15 + '%'}
          stroke="url(#lineGradTeal)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <line
          x1="86%"
          y1="66%"
          x2={50 + mousePos.x * 20 + '%'}
          y2={50 + mousePos.y * 15 + '%'}
          stroke="url(#lineGradTeal)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <line
          x1="10%"
          y1="70%"
          x2={50 + mousePos.x * 20 + '%'}
          y2={50 + mousePos.y * 15 + '%'}
          stroke="url(#lineGradTeal)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>

      {/* Floating Interactive Research Nodes */}
      {researchNodes.map((node) => (
        <div
          key={node.id}
          className="absolute hidden sm:flex items-center gap-1.5 pointer-events-none transition-transform duration-300 ease-out z-10"
          style={{
            left: node.x,
            top: node.y,
            transform: `translate(${mousePos.x * -25}px, ${mousePos.y * -25}px)`,
          }}
        >
          <div
            className={`${node.size} rounded-full animate-ping opacity-60`}
            style={{ backgroundColor: node.color }}
          />
          <div
            className={`w-2.5 h-2.5 rounded-full absolute top-0 left-0 shadow-sm`}
            style={{ backgroundColor: node.color }}
          />
          <span className="text-[10px] font-bold text-[#64748B] bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-[#E2E8F0] shadow-2xs">
            {node.label}
          </span>
        </div>
      ))}

      {/* Small Category Label (Section 4) */}
      <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold text-[#1E1B4B] bg-[#1E1B4B]/10 border border-[#1E1B4B]/20 mb-4 animate-fade-in-up">
        <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
        <span className="tracking-widest uppercase">RESEARCH INTELLIGENCE PLATFORM</span>
      </div>

      {/* Large Center NEXUS Title (Section 2 & 3) */}
      <div
        className="relative z-10 my-2 transition-transform duration-200 ease-out inline-block"
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
        }}
      >
        <h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none text-[#1E1B4B] relative inline-block select-none transition-all duration-300"
          style={{
            letterSpacing: isHovered ? '0.04em' : '0.01em',
            textShadow: isHovered
              ? '0 20px 40px rgba(30, 27, 75, 0.16), 0 0 25px rgba(13, 148, 136, 0.2)'
              : '0 10px 25px rgba(30, 27, 75, 0.08)',
          }}
        >
          NEXUS
        </h1>

        {/* Soft Indigo / Teal Glow Backdrop Layer */}
        <div
          className="absolute inset-0 rounded-full blur-3xl -z-10 pointer-events-none transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(13, 148, 136, 0.18) 0%, rgba(37, 99, 235, 0.12) 50%, rgba(30, 27, 75, 0.05) 100%)',
            opacity: isHovered ? 1 : 0.6,
          }}
        />
      </div>

      {/* Small Tagline (Section 2 & 4) */}
      <div className="relative z-10 mt-3 mb-6 max-w-xl mx-auto space-y-2 animate-fade-in-up">
        <p className="text-sm sm:text-base font-extrabold uppercase tracking-widest text-[#2563EB]">
          FROM RESEARCH PAPERS TO RESEARCH STRATEGY
        </p>
        <p className="text-base sm:text-lg text-[#0F172A] font-medium leading-relaxed">
          "NexUs doesn't just read research papers. It connects the evidence between them."
        </p>
      </div>

      {/* Hero CTA Buttons (Section 2) */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up">
        <button
          type="button"
          onClick={onDiscover}
          className="px-7 py-3.5 rounded-xl bg-[#1E1B4B] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1E1B4B]/90 transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
        >
          <Compass className="w-4 h-4 text-[#0D9488]" />
          <span>Discover Literature</span>
        </button>

        <button
          type="button"
          onClick={onAnalyze}
          className="px-7 py-3.5 rounded-xl bg-white border-2 border-[#1E1B4B] text-[#1E1B4B] font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
        >
          <Layers className="w-4 h-4 text-[#2563EB]" />
          <span>Analyze 5–8 Papers</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

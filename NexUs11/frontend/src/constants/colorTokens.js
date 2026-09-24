// NEXUS Design System Color Tokens & Evidence Classification
export const COLORS = {
  // Page & Backgrounds
  warmWhite: '#FBF9F5',
  linen: '#F3EFEA',
  pureWhite: '#FFFFFF',
  chalkWhite: '#F8FAFC',
  
  // Brand & Navigation
  deepIndigo: '#1E1B4B',
  royalCobalt: '#2563EB',
  indigoTint: '#4F46E5',
  
  // Reserved Semantic Colors
  seaGlassTeal: '#0D9488',   // Consensus, Ground Truth, Supported Evidence
  forestJade: '#15803D',     // Explicit Evidence, Verified Success
  brightCrimson: '#E11D48',  // Contradictions, Disagreements, Conflicting
  amberCoral: '#D97706',     // Research Gaps, Uncertain, Proposed Directions
  
  // Typography
  midnightSlate: '#0F172A',  // Primary Text
  slateGray: '#64748B',      // Secondary Text / Muted Labels
  
  // Neutral Accents
  coolMist: '#E2E8F0',       // Borders & Dividers
  fog: '#CBD5E1',            // Disabled / Inactive
};

// Section 12: Evidence Strength Badges
export const EVIDENCE_STRENGTH = {
  EXPLICIT: {
    code: 'EXPLICIT',
    label: 'EXPLICIT',
    badgeColor: '#15803D',
    bgColor: 'rgba(21, 128, 61, 0.1)',
    borderColor: '#15803D',
    description: 'Paper directly states it.',
  },
  SUPPORTED: {
    code: 'SUPPORTED',
    label: 'SUPPORTED',
    badgeColor: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.1)',
    borderColor: '#0D9488',
    description: 'Multiple papers support it.',
  },
  INFERRED: {
    code: 'INFERRED',
    label: 'INFERRED',
    badgeColor: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: '#2563EB',
    description: 'NexUs derived it by comparing evidence across papers.',
  },
  UNCERTAIN: {
    code: 'UNCERTAIN',
    label: 'UNCERTAIN',
    badgeColor: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: '#D97706',
    description: 'Evidence is currently insufficient.',
  },
  CONFLICTING: {
    code: 'CONFLICTING',
    label: 'CONFLICTING',
    badgeColor: '#E11D48',
    bgColor: 'rgba(225, 29, 72, 0.1)',
    borderColor: '#E11D48',
    description: 'Reviewed papers disagree or present divergent outcomes.',
  },
};

export const BADGE_TYPES = {
  EVIDENCE_BACKED: {
    label: 'Evidence-backed',
    color: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.1)',
    borderColor: '#0D9488',
    description: 'Information directly supported by uploaded papers.',
  },
  AI_SYNTHESIS: {
    label: 'AI synthesis',
    color: '#4F46E5',
    bgColor: 'rgba(79, 70, 229, 0.1)',
    borderColor: '#4F46E5',
    description: 'AI conclusion derived from multiple pieces of evidence.',
  },
  PROPOSED_DIRECTION: {
    label: 'Proposed direction',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: '#D97706',
    description: 'AI-generated possible research direction.',
  },
};

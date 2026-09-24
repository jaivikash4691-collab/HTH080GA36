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
// Safe fallback for legacy references
export const EVIDENCE_STRENGTH = {
  EXPLICIT: { code: 'EXPLICIT', label: 'VERIFIED', badgeColor: '#15803D', bgColor: 'rgba(21, 128, 61, 0.1)', borderColor: '#15803D', description: 'Extracted from source paper.' },
  SUPPORTED: { code: 'SUPPORTED', label: 'GROUNDED', badgeColor: '#0D9488', bgColor: 'rgba(13, 148, 136, 0.1)', borderColor: '#0D9488', description: 'Supported across uploaded papers.' },
  INFERRED: { code: 'INFERRED', label: 'SYNTHESIZED', badgeColor: '#2563EB', bgColor: 'rgba(37, 99, 235, 0.1)', borderColor: '#2563EB', description: 'Derived across paper methodologies.' },
  UNCERTAIN: { code: 'UNCERTAIN', label: 'OPEN INQUIRY', badgeColor: '#D97706', bgColor: 'rgba(217, 119, 6, 0.1)', borderColor: '#D97706', description: 'Requires external validation.' },
  CONFLICTING: { code: 'CONFLICTING', label: 'DISCREPANCY', badgeColor: '#E11D48', bgColor: 'rgba(225, 29, 72, 0.1)', borderColor: '#E11D48', description: 'Divergent results detected.' },
};

export const BADGE_TYPES = {
  EVIDENCE_BACKED: {
    label: 'Paper-grounded',
    color: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.1)',
    borderColor: '#0D9488',
    description: 'Directly supported by uploaded research papers.',
  },
  PAPER_GROUNDED: {
    label: 'Paper-grounded',
    color: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.1)',
    borderColor: '#0D9488',
    description: 'Directly supported by uploaded research papers.',
  },
  AI_SYNTHESIS: {
    label: 'AI-Generated Synthesis',
    color: '#4F46E5',
    bgColor: 'rgba(79, 70, 229, 0.1)',
    borderColor: '#4F46E5',
    description: 'AI conclusion synthesized across source literature.',
  },
  PROPOSED_DIRECTION: {
    label: 'Potential Research Direction',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: '#D97706',
    description: 'Potential research direction synthesized from literature gaps.',
  },
  POSSIBLE_OPPORTUNITY: {
    label: 'Possible Research Opportunity',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: '#D97706',
    description: 'Possible research opportunity formulated by AI analysis.',
  },
  AI_QUESTION: {
    label: 'AI-generated Research Question',
    color: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: '#2563EB',
    description: 'AI-generated exploratory inquiry for investigation.',
  },
};

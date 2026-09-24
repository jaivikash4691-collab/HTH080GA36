/**
 * Evidence Verification & Strength Classification Utility
 * Implements Section 12 Evidence Strength Taxonomy:
 * - EXPLICIT: Direct textual quotes with specific page number
 * - SUPPORTED: Quantitative experimental results or statistical findings
 * - INFERRED: Synthesized pattern across papers
 * - UNCERTAIN: Speculative or preliminary observation
 * - CONFLICTING: Direct contradiction between two papers
 */

export const EVIDENCE_STRENGTHS = {
  EXPLICIT: 'EXPLICIT',
  SUPPORTED: 'SUPPORTED',
  INFERRED: 'INFERRED',
  UNCERTAIN: 'UNCERTAIN',
  CONFLICTING: 'CONFLICTING',
};

export function classifyEvidenceStrength(evidenceText = '', metadata = {}) {
  const lower = evidenceText.toLowerCase();

  if (metadata.hasConflict || lower.includes('contradict') || lower.includes('disagree')) {
    return EVIDENCE_STRENGTHS.CONFLICTING;
  }
  if (lower.includes('suggests') || lower.includes('hypothesize') || lower.includes('unverified')) {
    return EVIDENCE_STRENGTHS.UNCERTAIN;
  }
  if (lower.includes('synthesis indicates') || lower.includes('pattern reveals')) {
    return EVIDENCE_STRENGTHS.INFERRED;
  }
  if (/\b\d+(\.\d+)?%\b/.test(evidenceText) || lower.includes('auroc') || lower.includes('p <')) {
    return EVIDENCE_STRENGTHS.SUPPORTED;
  }

  // Default to EXPLICIT if specific page or quote is anchored
  return metadata.page ? EVIDENCE_STRENGTHS.EXPLICIT : EVIDENCE_STRENGTHS.SUPPORTED;
}

export function formatCitationAnchor(paperCode, page) {
  return page ? `${paperCode} • p.${page}` : paperCode;
}

export default {
  EVIDENCE_STRENGTHS,
  classifyEvidenceStrength,
  formatCitationAnchor,
};

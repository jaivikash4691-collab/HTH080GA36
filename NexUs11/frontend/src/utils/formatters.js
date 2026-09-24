/**
 * Format paper citation string
 */
export function formatCitation(code, page) {
  if (!page) return code;
  return `${code} • p.${page}`;
}

/**
 * Truncate long strings cleanly
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Format percentages
 */
export function formatPercent(value) {
  if (typeof value !== 'number') return value;
  return `${Math.round(value * 10) / 10}%`;
}

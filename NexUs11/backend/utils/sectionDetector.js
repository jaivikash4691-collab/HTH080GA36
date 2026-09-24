/**
 * Section Detector for Academic Research Papers
 * Identifies standard research sections with page and position awareness.
 */

export const SECTION_TYPES = [
  'Title',
  'Abstract',
  'Introduction',
  'Related Work',
  'Literature Review',
  'Methodology',
  'System Architecture',
  'Implementation',
  'Dataset',
  'Experiments',
  'Results',
  'Discussion',
  'Advantages',
  'Limitations',
  'Future Work',
  'Conclusion',
  'References',
];

const SECTION_PATTERNS = [
  { section: 'Abstract', regex: /(?:^|\n)\s*(?:abstract|executive\s+summary)\b/i },
  { section: 'Introduction', regex: /(?:^|\n)\s*(?:1\.?\s*)?introduction\b/i },
  { section: 'Related Work', regex: /(?:^|\n)\s*(?:2\.?\s*)?(?:related\s+work|prior\s+art|background)\b/i },
  { section: 'Literature Review', regex: /(?:^|\n)\s*(?:literature\s+review|state\s+of\s+the\s+art)\b/i },
  { section: 'System Architecture', regex: /(?:^|\n)\s*(?:system\s+architecture|proposed\s+framework|system\s+design|architectural\s+overview)\b/i },
  { section: 'Methodology', regex: /(?:^|\n)\s*(?:3\.?\s*)?(?:methodology|methods|proposed\s+method|approach|technical\s+approach)\b/i },
  { section: 'Implementation', regex: /(?:^|\n)\s*(?:implementation|system\s+implementation|software\s+stack|engineering\s+pipeline)\b/i },
  { section: 'Dataset', regex: /(?:^|\n)\s*(?:dataset|data\s+collection|corpus|experimental\s+data|benchmark\s+suite)\b/i },
  { section: 'Experiments', regex: /(?:^|\n)\s*(?:4\.?\s*)?(?:experiments|experimental\s+setup|evaluation\s+setup|empirical\s+study)\b/i },
  { section: 'Results', regex: /(?:^|\n)\s*(?:5\.?\s*)?(?:results|findings|empirical\s+results|performance\s+evaluation)\b/i },
  { section: 'Discussion', regex: /(?:^|\n)\s*(?:6\.?\s*)?(?:discussion|comparative\s+analysis|interpretation)\b/i },
  { section: 'Advantages', regex: /(?:^|\n)\s*(?:advantages|benefits|key\s+strengths|comparative\s+advantage)\b/i },
  { section: 'Limitations', regex: /(?:^|\n)\s*(?:limitations|threats\s+to\s+validity|boundary\s+conditions|drawbacks)\b/i },
  { section: 'Future Work', regex: /(?:^|\n)\s*(?:future\s+work|research\s+directions|future\s+extensions|open\s+challenges)\b/i },
  { section: 'Conclusion', regex: /(?:^|\n)\s*(?:7\.?\s*)?(?:conclusion|concluding\s+remarks|summary)\b/i },
  { section: 'References', regex: /(?:^|\n)\s*(?:references|bibliography|citations)\b/i },
];

export function detectSection(textSnippet, fallback = 'General') {
  if (!textSnippet) return fallback;
  const firstLines = textSnippet.slice(0, 300);
  for (const { section, regex } of SECTION_PATTERNS) {
    if (regex.test(firstLines)) {
      return section;
    }
  }
  return fallback;
}

export function parseSectionsFromText(fullText = '') {
  const lines = fullText.split(/\r?\n/);
  const sections = [];
  let currentSection = 'Introduction';
  let currentContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let matchedSection = null;
    for (const { section, regex } of SECTION_PATTERNS) {
      if (regex.test(line) && line.length < 80) {
        matchedSection = section;
        break;
      }
    }

    if (matchedSection) {
      if (currentContent.length > 0) {
        sections.push({
          section: currentSection,
          content: currentContent.join('\n').trim(),
        });
        currentContent = [];
      }
      currentSection = matchedSection;
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      section: currentSection,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections.length > 0 ? sections : [{ section: 'General', content: fullText }];
}

export default {
  SECTION_TYPES,
  detectSection,
  parseSectionsFromText,
};

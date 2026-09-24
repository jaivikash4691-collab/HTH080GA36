/**
 * Academic Question Classifier & Out-of-Scope Detection Service
 * Categorizes researcher queries and prioritizes relevant document sections.
 */

export const QUESTION_TYPES = {
  SUMMARY: 'SUMMARY',
  COMPARISON: 'COMPARISON',
  METHODOLOGY: 'METHODOLOGY',
  IMPLEMENTATION: 'IMPLEMENTATION',
  TECHNOLOGY: 'TECHNOLOGY',
  DATASET: 'DATASET',
  RESULTS: 'RESULTS',
  ADVANTAGES: 'ADVANTAGES',
  DISADVANTAGES: 'DISADVANTAGES',
  LIMITATIONS: 'LIMITATIONS',
  CONTRADICTION: 'CONTRADICTION',
  RESEARCH_GAP: 'RESEARCH_GAP',
  RESEARCH_QUESTION: 'RESEARCH_QUESTION',
  RESEARCH_DIRECTION: 'RESEARCH_DIRECTION',
  FUTURE_WORK: 'FUTURE_WORK',
  GENERAL_PAPER_QUESTION: 'GENERAL_PAPER_QUESTION',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
};

const OUT_OF_SCOPE_PATTERNS = [
  /\b(president|prime minister|capital of|weather in|who is the current|stock price|recipe for|football|cricket|movie|celebrity|lyrics|joke|story about|song)\b/i,
  /\b(who won the|what is the height of mount|current year|tomorrow|yesterday)\b/i,
];

export const classifierService = {
  /**
   * Classifies a user query and returns question type + prioritized document sections
   */
  classify(query = '') {
    const q = (query || '').trim().toLowerCase();

    // Check for explicit out-of-scope general trivia
    for (const pattern of OUT_OF_SCOPE_PATTERNS) {
      if (pattern.test(q)) {
        return {
          type: QUESTION_TYPES.OUT_OF_SCOPE,
          isOutOfScope: true,
          prioritizedSections: [],
          rejectionMessage:
            'This question is outside the scope of the uploaded research papers. I can answer questions related to the papers in this project.',
        };
      }
    }

    // Question classification rules
    if (/\b(compare|comparison|versus|vs\.?|difference between|how do .+ compare)\b/i.test(q)) {
      if (/\b(method|methodology|approach|technique)\b/i.test(q)) {
        return {
          type: QUESTION_TYPES.COMPARISON,
          isOutOfScope: false,
          prioritizedSections: ['Methodology', 'System Architecture', 'Implementation', 'Experiments'],
        };
      }
      if (/\b(database|frontend|backend|framework|stack|tech|technology|react|angular|node|python)\b/i.test(q)) {
        return {
          type: QUESTION_TYPES.TECHNOLOGY,
          isOutOfScope: false,
          prioritizedSections: ['Implementation', 'System Architecture', 'Methodology'],
        };
      }
      return {
        type: QUESTION_TYPES.COMPARISON,
        isOutOfScope: false,
        prioritizedSections: ['Methodology', 'Implementation', 'Results', 'Discussion'],
      };
    }

    if (/\b(database|db|frontend|backend|react|angular|node|python|java|framework|tech stack|technology|libraries|tools)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.TECHNOLOGY,
        isOutOfScope: false,
        prioritizedSections: ['Implementation', 'System Architecture', 'Methodology'],
      };
    }

    if (/\b(algorithm|architecture|model|pipeline|design|workflow|how does it work|how is .+ built)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.IMPLEMENTATION,
        isOutOfScope: false,
        prioritizedSections: ['System Architecture', 'Methodology', 'Implementation', 'Experiments'],
      };
    }

    if (/\b(methodology|method|approach|technique|protocol|procedure)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.METHODOLOGY,
        isOutOfScope: false,
        prioritizedSections: ['Methodology', 'System Architecture', 'Implementation', 'Experiments'],
      };
    }

    if (/\b(dataset|data|sample size|corpus|benchmark|training data|test data|cohort)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.DATASET,
        isOutOfScope: false,
        prioritizedSections: ['Dataset', 'Experiments', 'Methodology'],
      };
    }

    if (/\b(accuracy|f1|precision|recall|metric|result|performance|score|outcome|findings|highest reported)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.RESULTS,
        isOutOfScope: false,
        prioritizedSections: ['Results', 'Experiments', 'Discussion'],
      };
    }

    if (/\b(advantage|benefit|strength|superior|why is it better|pro)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.ADVANTAGES,
        isOutOfScope: false,
        prioritizedSections: ['Advantages', 'Results', 'Discussion', 'Conclusion'],
      };
    }

    if (/\b(limitation|drawback|disadvantage|weakness|threat|constraint|shortcoming)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.LIMITATIONS,
        isOutOfScope: false,
        prioritizedSections: ['Limitations', 'Discussion', 'Future Work', 'Conclusion'],
      };
    }

    if (/\b(contradiction|conflict|disagree|diverge|opposing)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.CONTRADICTION,
        isOutOfScope: false,
        prioritizedSections: ['Results', 'Discussion', 'Limitations', 'Methodology'],
      };
    }

    if (/\b(gap|missing|unexplored|blindspot|unanswered|open challenge)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.RESEARCH_GAP,
        isOutOfScope: false,
        prioritizedSections: ['Limitations', 'Future Work', 'Discussion', 'Conclusion', 'Related Work'],
      };
    }

    if (/\b(future work|next steps|direction|extension|what to investigate next|where to go next)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.FUTURE_WORK,
        isOutOfScope: false,
        prioritizedSections: ['Future Work', 'Discussion', 'Conclusion', 'Limitations'],
      };
    }

    if (/\b(summary|overview|summarize|abstract|what is paper|main idea)\b/i.test(q)) {
      return {
        type: QUESTION_TYPES.SUMMARY,
        isOutOfScope: false,
        prioritizedSections: ['Abstract', 'Introduction', 'Conclusion', 'Results'],
      };
    }

    return {
      type: QUESTION_TYPES.GENERAL_PAPER_QUESTION,
      isOutOfScope: false,
      prioritizedSections: ['Abstract', 'Introduction', 'Methodology', 'Results', 'Conclusion'],
    };
  },
};

export default classifierService;

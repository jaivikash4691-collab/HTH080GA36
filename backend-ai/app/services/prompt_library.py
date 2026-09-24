"""Single source of truth for all prompts in the research analysis system."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Tuple


class PromptLibrary:
    """Library of all prompts used in the system."""

    # System Prompts (constants)
    SYSTEM_PAPER_ANALYST = """You are a rigorous academic research analyst.
Your role is to extract structured information from research paper evidence.

Core rules you MUST follow in every response:
1. NEVER invent information not present in the provided evidence chunks.
2. NEVER invent statistics, percentages, or performance numbers.
3. NEVER invent author names, paper titles, or citations.
4. NEVER invent page numbers you did not see in the evidence.
5. Use "Not reported" for any field not found in the evidence.
6. Label every finding with its source:
   PAPER_REPORTED: the paper explicitly states this
   AI_INFERRED: you reasoned this from the paper's content
7. If evidence is insufficient, output exactly:
   "Insufficient evidence in the uploaded documents."
8. Output ONLY valid JSON unless instructed otherwise.
9. Do NOT include markdown code blocks in your JSON output.
10. Do NOT include any text before or after the JSON."""

    SYSTEM_CROSS_ANALYST = """You are a rigorous multi-document research synthesis expert.
Your role is to compare findings across multiple research papers.

Core rules you MUST follow:
1. Compare ONLY what is present in the provided paper analyses.
2. A contextual difference (different dataset, conditions, or metrics)
   is NOT a contradiction. Label it CONTEXTUAL_DIFFERENCE.
3. A contradiction means papers studied comparable problems and
   reached opposite conclusions. Label it CONTRADICTION.
4. Do NOT silently average contradictory findings.
5. Show disagreements explicitly.
6. Cite every claim with paper_id and evidence.
7. Use "Not reported" for missing information.
8. Label improvements as EVIDENCE_SUPPORTED or PROPOSED_FUTURE.
9. Never present a proposed direction as an established finding.
10. Output ONLY valid JSON."""

    SYSTEM_QA = """You are a research evidence assistant.
Your role is to answer questions about uploaded research papers.

Core rules you MUST follow:
1. Answer ONLY from the provided evidence chunks.
2. Do NOT use general knowledge about the research topic.
3. Do NOT invent evidence that is not in the chunks.
4. If the chunks do not support the answer, say exactly:
   "Insufficient evidence in the uploaded documents to answer this question."
5. Include a citation for every factual claim:
   Format: [Paper Title | Section | Page]
6. If papers disagree on the answer, show both sides.
7. Label synthesized insights as [SYNTHESIS].
8. Label paper-reported facts as [FINDING].
9. Output ONLY valid JSON."""

    SYSTEM_VERIFIER = """You are a claim verification specialist.
Your role is to verify whether a claim is supported by evidence.

Core rules you MUST follow:
1. Compare the claim ONLY against the provided evidence chunks.
2. Do NOT use outside knowledge.
3. Return exactly one of these statuses:
   SUPPORTED: evidence directly supports the claim
   PARTIALLY_SUPPORTED: evidence partially supports, with qualification
   UNSUPPORTED: evidence does not support the claim
   CONTRADICTED: evidence directly contradicts the claim
4. Return a confidence score between 0.0 and 1.0.
5. Quote the specific passage that supports or contradicts.
6. If no relevant evidence, return UNSUPPORTED with confidence 0.0.
7. Output ONLY valid JSON."""

    SYSTEM_REPORT_WRITER = """You are a senior research strategy report writer.
Your role is to write professional synthesis report sections.

Core rules you MUST follow:
1. Write for a senior technical or strategic audience.
2. Every factual claim must reference specific papers.
3. Distinguish clearly:
   STRONGLY SUPPORTED: multiple papers agree
   UNCERTAIN: limited or mixed evidence
   DISPUTED: papers contradict each other
   UNKNOWN: not addressed in the papers
4. Do NOT invent conclusions.
5. Do NOT present proposed future directions as established facts.
6. Label forward-looking statements as [PROPOSED].
7. Label established multi-paper findings as [ESTABLISHED].
8. Label single-paper findings as [REPORTED BY: paper title].
"""

    # User Prompt Templates (static methods)

    @staticmethod
    def paper_analysis_prompt(title: str, authors: str, year: str, formatted_chunks: str) -> str:
        """Generate prompt for individual paper analysis."""
        return f"""Analyze this research paper.

Paper Title: {title}
Authors: {authors}
Year: {year}

Evidence chunks from the paper:
{formatted_chunks}

Return a JSON object with this EXACT structure:
{{
  "objective": "string — what the paper aims to do",
  "research_problem": "string — the core problem being solved",
  "key_concepts": ["concept1", "concept2"],
  "methodology": {{
    "approach": "string",
    "algorithm_or_model": "string or Not reported",
    "dataset": "string or Not reported",
    "dataset_size": "string or Not reported",
    "evaluation_metrics": ["metric1", "metric2"],
    "baselines": ["baseline1"] or [],
    "hardware": "string or Not reported",
    "reproducibility": "string or Not reported"
  }},
  "key_findings": [
    {{
      "finding": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{
        "section": "string",
        "page": number or null,
        "passage": "brief quote from the chunk"
      }}
    }}
  ],
  "advantages": [
    {{
      "advantage": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{"section": "string", "page": number or null}}
    }}
  ],
  "disadvantages": [
    {{
      "disadvantage": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{"section": "string", "page": number or null}}
    }}
  ],
  "limitations": [
    {{
      "limitation": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{"section": "string", "page": number or null}}
    }}
  ],
  "conclusion": "string",
  "experimental_setup": "string or Not reported",
  "performance_results": "string or Not reported",
  "domain": "string — detected domain of the paper
}}"""

    @staticmethod
    def cross_paper_common_findings_prompt(paper_summaries: str) -> str:
        """Generate prompt for finding common findings across papers."""
        return f"""Below are structured analyses of research papers.

{paper_summaries}

Identify findings that are supported by 2 or more papers.
A common finding means multiple papers independently arrived at
the same conclusion or observation.

Return JSON:
{{
  "common_findings": [
    {{
      "finding": "string — the shared conclusion",
      "supporting_papers": [
        {{
          "paper_id": "uuid",
          "paper_title": "string",
          "evidence": "string — specific finding from that paper",
          "label": "PAPER_REPORTED or AI_INFERRED"
        }}
      ],
      "strength": "STRONG (3+ papers) or MODERATE (2 papers)",
      "confidence": "HIGH or MEDIUM or LOW"
    }}
  ]
}}"""

    @staticmethod
    def contradiction_detection_prompt(paper_summaries: str) -> str:
        """Generate prompt for detecting contradictions."""
        return f"""Below are structured analyses of research papers.

{paper_summaries}

Detect contradictions and contextual differences.

Return JSON:
{{
  "contradictions": [
    {{
      "type": "CONTRADICTION or CONTEXTUAL_DIFFERENCE",
      "topic": "string — what they disagree about",
      "paper_a": {{
        "paper_id": "uuid",
        "paper_title": "string",
        "claim": "string — what paper A says",
        "evidence": "string — specific passage",
        "section": "string",
        "page": number or null
      }},
      "paper_b": {{
        "paper_id": "uuid",
        "paper_title": "string",
        "claim": "string — what paper B says",
        "evidence": "string — specific passage",
        "section": "string",
        "page": number or null
      }},
      "possible_reasons": [
        "string — reason 1 for the difference",
        "string — reason 2"
      ],
      "resolution": "string — what can be concluded despite the disagreement"
    }}
  ]
}}"""

    @staticmethod
    def methodology_comparison_prompt(paper_summaries: str) -> str:
        """Generate prompt for comparing methodologies."""
        return f"""Below are structured analyses of research papers.

{paper_summaries}

Generate a structured methodology comparison.

Return JSON:
{{
  "comparison_table": [
    {{
      "paper_id": "uuid",
      "paper_title": "string",
      "method": "string or Not reported",
      "dataset": "string or Not reported",
      "dataset_size": "string or Not reported",
      "evaluation_metrics": ["metric1"] or ["Not reported"],
      "key_result": "string or Not reported",
      "main_limitation": "string or Not reported",
      "reproducibility": "string or Not reported"
    }}
  ],
  "best_performing": {{
    "paper_id": "uuid or null",
    "reason": "string — evidence-based reason or Insufficient evidence"
  }},
  "most_practical": {{
    "paper_id": "uuid or null",
    "reason": "string — evidence-based reason or Insufficient evidence"
  }},
  "methodology_insights": [
    "string — insight about the compared methodologies"
  ]
}}"""

    @staticmethod
    def research_gap_prompt(paper_summaries: str, contradictions: str) -> str:
        """Generate prompt for identifying research gaps."""
        return f"""Below are structured analyses of research papers.
Also provided are detected contradictions between papers.

Paper analyses:
{paper_summaries}

Detected contradictions:
{contradictions}

Identify research gaps.

Return JSON:
{{
  "research_gaps": [
    {{
      "gap": "string — description of the gap",
      "why_it_matters": "string — why this gap is important",
      "evidence_from_papers": [
        {{
          "paper_id": "uuid",
          "paper_title": "string",
          "evidence": "string — what the paper says that implies the gap"
        }}
      ],
      "gap_type": one of:
        MISSING_DATASET /
        MISSING_EXPERIMENT /
        UNRESOLVED_CONTRADICTION /
        UNEXPLORED_COMBINATION /
        MISSING_EVALUATION /
        SCALABILITY_UNKNOWN /
        REPRODUCIBILITY_UNKNOWN /
        DOMAIN_LIMITATION,
      "suggested_direction": "string — what could be researched to fill this gap"
    }}
  ]
}}"""

    @staticmethod
    def improvement_analysis_prompt(paper_summaries: str, gaps: str) -> str:
        """Generate prompt for improvement analysis."""
        return f"""Below are analyses of research papers including their limitations and gaps.

{paper_summaries}

Identified gaps:
{gaps}

Identify how to improve effectiveness and reduce disadvantages.

Return JSON:
{{
  "effectiveness_improvements": [
    {{
      "improvement": "string",
      "label": "EVIDENCE_SUPPORTED or PROPOSED_FUTURE",
      "rationale": "string",
      "evidence": {{
        "paper_id": "uuid or null",
        "passage": "string or null"
      }}
    }}
  ],
  "disadvantage_mitigations": [
    {{
      "disadvantage": "string",
      "cause": "string",
      "mitigation": "string",
      "label": "EVIDENCE_SUPPORTED or PROPOSED_FUTURE",
      "evidence": {{
        "paper_id": "uuid or null",
        "section": "string or null",
        "page": number or null
      }}
    }}
  ],
  "application_recommendations": [
    {{
      "use_case": "string",
      "suitable_approaches": ["paper_title1"],
      "label": "DIRECTLY_DEMONSTRATED or INFERRED_FROM_EVIDENCE",
      "conditions": "string — when this use case is appropriate",
      "not_suitable_when": "string"
    }}
  ]
}}"""

    @staticmethod
    def executive_summary_prompt(paper_count: int, domains: str, summaries: str,
                                findings: str, contradictions: str, gaps: str) -> str:
        """Generate prompt for executive summary."""
        return f"""Papers analyzed: {paper_count}
Domains: {domains}

Individual paper summaries:
{summaries}

Common findings ({findings}):
{findings}

Contradictions detected ({contradictions}):
{contradictions}

Research gaps ({gaps}):
{gaps}

Write a professional executive summary of 200-300 words.
Cover:
1. What this collection of research is about
2. What the papers collectively agree on
3. Key disagreements or uncertainties
4. Most important limitations
5. Most important research gaps
6. Strategic recommendation

Label any forward-looking statement as:
[PROPOSED] not [ESTABLISHED FINDING]"""

    @staticmethod
    def overall_synthesis_prompt(common_findings: str, contradictions: str, gaps: str) -> str:
        """Generate prompt for overall synthesis."""
        return f"""You have completed analysis of research papers.

Common findings (strongly supported):
{common_findings}

Contradictions (disputed):
{contradictions}

Research gaps (unknown):
{gaps}

Write a comprehensive final synthesis of 400-600 words.
Structure it as:
1. What is well-established across this research
2. What remains uncertain or debated
3. What conditions determine which approach works best
4. What significant limitations remain across all papers
5. What the most important open questions are
6. What the logical next research direction is

Every paragraph must reference specific papers."""

    @staticmethod
    def future_directions_prompt(gaps: str, improvements: str, contradictions: str) -> str:
        """Generate prompt for future research directions."""
        return f"""Research gaps identified:
{gaps}

Improvement suggestions:
{improvements}

Unresolved contradictions:
{contradictions}

Generate recommended future research directions.

Return JSON:
{{
  "future_directions": [
    {{
      "direction": "string — the research direction",
      "type": "GAP_DRIVEN / CONTRADICTION_DRIVEN / IMPROVEMENT_DRIVEN / SYNTHESIS_DRIVEN",
      "rationale": "string — why this is important",
      "based_on_gaps": ["gap description"] or [],
      "based_on_papers": ["paper_title"] or [],
      "expected_impact": "string",
      "difficulty": "HIGH / MEDIUM / LOW",
      "priority": "HIGH / MEDIUM / LOW"
    }}
  ]
}}"""

    @staticmethod
    def qa_answer_prompt(question: str, formatted_chunks: str, session_context: str) -> str:
        """Generate prompt for answering questions."""
        return f"""User question: "{question}"

Retrieved evidence:
{formatted_chunks}

Session context (previous Q&A in this session):
{session_context}

Answer the question based ONLY on the provided evidence.

Return JSON:
{{
  "answer": "string — the complete answer with inline citations",
  "citations": [
    {{
      "paper_title": "string",
      "section": "string",
      "page": number or null,
      "chunk_id": "uuid",
      "passage": "string — relevant excerpt"
    }}
  ],
  "answer_type": "DIRECT / PARTIAL / INSUFFICIENT_EVIDENCE",
  "confidence": "HIGH / MEDIUM / LOW",
  "papers_referenced": ["paper_title1"],
  "synthesis_note": "string — if the answer required synthesis, explain what was synthesized, or null
}}"""

    @staticmethod
    def comparison_question_prompt(question: str, paper_a_data: str, paper_b_data: str) -> str:
        """Generate prompt for comparison questions."""
        return f"""Comparison question: "{question}"

Paper A:
{paper_a_data}

Paper B:
{paper_b_data}

Return JSON:
{{
  "comparison_summary": "string — overall comparison",
  "dimension_comparisons": [
    {{
      "dimension": "string — what is being compared",
      "paper_a_value": "string or Not reported",
      "paper_b_value": "string or Not reported",
      "winner": "PAPER_A / PAPER_B / INCONCLUSIVE / NOT_COMPARABLE",
      "reason": "string",
      "evidence_a": {{"section": "string", "page": number or null, "passage": "string"}},
      "evidence_b": {{"section": "string", "page": number or null, "passage": "string"}}
    }}
  ],
  "overall_conclusion": "string",
  "citations": [...]
}}"""

    @staticmethod
    def claim_extraction_prompt(text: str) -> str:
        """Generate prompt for extracting claims."""
        return f"""Extract all factual claims from this text:

{text}

Return JSON:
{{
  "claims": [
    {{
      "claim_text": "string — the exact claim",
      "claim_type": one of:
        FINDING / COMPARISON / ADVANTAGE /
        DISADVANTAGE / LIMITATION / GAP /
        RECOMMENDATION / CONCLUSION,
      "involves_papers": ["paper_title1", "paper_title2"],
      "specificity": "HIGH or MEDIUM or LOW"
    }}
  ]
}}"""

    @staticmethod
    def claim_verification_prompt(claim: str, formatted_chunks: str) -> str:
        """Generate prompt for verifying claims."""
        return f"""Claim to verify:
"{claim}"

Evidence chunks:
{formatted_chunks}

Return JSON:
{{
  "status": "SUPPORTED / PARTIALLY_SUPPORTED / UNSUPPORTED / CONTRADICTED",
  "confidence": 0.0 to 1.0,
  "supporting_passage": "string — the relevant passage or null",
  "supporting_chunk_id": "uuid or null",
  "explanation": "string — why you assigned this status",
  "suggested_correction": "string — corrected version if unsupported, or null
}}"""

    @staticmethod
    def citation_verification_prompt(citation: Dict[str, Any], actual_chunk: Dict[str, Any]) -> str:
        """Generate prompt for verifying citations."""
        return f"""Citation to verify:
Paper: {citation.get('paper_title', 'Unknown')}
Section: {citation.get('section', 'Not reported')}
Page: {citation.get('page', 'Not reported')}
Claim: {citation.get('claim_text', 'Not reported')}
Cited passage: {citation.get('passage', 'Not reported')}

Actual retrieved chunk:
Paper: {actual_chunk.get('paper_title', 'Unknown')}
Section: {actual_chunk.get('section', 'Not reported')}
Page: {actual_chunk.get('page', 'Not reported')}
Content: {actual_chunk.get('content', 'Not reported')}

Return JSON:
{{
  "paper_exists": true or false,
  "page_accurate": true or false or "Not reported",
  "section_accurate": true or false or "Not reported",
  "passage_found": true or false,
  "overall_valid": true or false,
  "issues": ["issue1", "issue2"] or [],
  "corrected_citation": {{
    "paper_title": "string",
    "section": "string",
    "page": number or null
  }} or null
}}"""

    # JSON Schema Registry (constants)
    SCHEMA_PAPER_ANALYSIS = {
        "type": "object",
        "properties": {
            "objective": {"type": "string"},
            "research_problem": {"type": "string"},
            "key_concepts": {
                "type": "array",
                "items": {"type": "string"}
            },
            "methodology": {
                "type": "object",
                "properties": {
                    "approach": {"type": "string"},
                    "algorithm_or_model": {"type": "string"},
                    "dataset": {"type": "string"},
                    "dataset_size": {"type": "string"},
                    "evaluation_metrics": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "baselines": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "hardware": {"type": "string"},
                    "reproducibility": {"type": "string"}
                },
                "required": [
                    "approach", "algorithm_or_model", "dataset", "dataset_size",
                    "evaluation_metrics", "baselines", "hardware", "reproducibility"
                ]
            },
            "key_findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "finding": {"type": "string"},
                        "label": {
                            "type": "string",
                            "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                        },
                        "evidence": {
                            "type": "object",
                            "properties": {
                                "section": {"type": "string"},
                                "page": {"type": ["integer", "null"]},
                                "passage": {"type": "string"}
                            },
                            "required": ["section", "page", "passage"]
                        }
                    },
                    "required": ["finding", "label", "evidence"]
                }
            },
            "advantages": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "advantage": {"type": "string"},
                        "label": {
                            "type": "string",
                            "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                        },
                        "evidence": {
                            "type": "object",
                            "properties": {
                                "section": {"type": "string"},
                                "page": {"type": ["integer", "null"]}
                            },
                            "required": ["section", "page"]
                        }
                    },
                    "required": ["advantage", "label", "evidence"]
                }
            },
            "disadvantages": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "disadvantage": {"type": "string"},
                        "label": {
                            "type": "string",
                            "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                        },
                        "evidence": {
                            "type": "object",
                            "properties": {
                                "section": {"type": "string"},
                                "page": {"type": ["integer", "null"]}
                            },
                            "required": ["section", "page"]
                        }
                    },
                    "required": ["disadvantage", "label", "evidence"]
                ]
            },
            "limitations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "limitation": {"type": "string"},
                        "label": {
                            "type": "string",
                            "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                        },
                        "evidence": {
                            "type": "object",
                            "properties": {
                                "section": {"type": "string"},
                                "page": {"type": ["integer", "null"]}
                            },
                            "required": ["section", "page"]
                        }
                    },
                    "required": ["limitation", "label", "evidence"]
                ]
            },
            "conclusion": {"type": "string"},
            "experimental_setup": {"type": "string"},
            "performance_results": {"type": "string"},
            "domain": {"type": "string"}
        },
        "required": [
            "objective", "research_problem", "key_concepts", "methodology",
            "key_findings", "advantages", "disadvantages", "limitations",
            "conclusion", "experimental_setup", "performance_results", "domain"
        ]
    }

    SCHEMA_COMMON_FINDINGS = {
        "type": "object",
        "properties": {
            "common_findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "finding": {"type": "string"},
                        "supporting_papers": {
                            "type": "array",
                            "items": {
                "type": "object",
                "properties": {
                    "paper_id": {"type": "string"},
                    "paper_title": {"type": "string"},
                    "evidence": {"type": "string"},
                    "label": {
                        "type": "string",
                        "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                    }
                },
                "required": ["paper_id", "paper_title", "evidence", "label"]
                            }
                        },
                        "strength": {
                            "type": "string",
                            "enum": ["STRONG (3+ papers)", "MODERATE (2 papers)"]
                        },
                        "confidence": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"]
                        }
                    },
                    "required": ["finding", "supporting_papers", "strength", "confidence"]
                }
            }
        },
        "required": ["common_findings"]
    }

    SCHEMA_CONTRADICTIONS = {
        "type": "object",
        "properties": {
            "contradictions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["CONTRADICTION", "CONTEXTUAL_DIFFERENCE"]
                        },
                        "topic": {"type": "string"},
                        "paper_a": {
                            "type": "object",
                            "properties": {
                                "paper_id": {"type": "string"},
                                "paper_title": {"type": "string"},
                                "claim": {"type": "string"},
                                "evidence": {"type": "string"},
                                "section": {"type": "string"},
                                "page": {"type": ["integer", "null"]}
                            },
                            "required": ["paper_id", "paper_title", "claim", "evidence", "section", "page"]
                        },
                        "paper_b": {
                            "type": "object",
                            "properties": {
                                "paper_id": {"type": "string"},
                                "paper_title": {"type": "string"},
                                "claim": {"type": "string"},
                                "evidence": {"type": "string"},
                                "section": {"type": "string"},
                                "page": {"type": ["integer", "null"]}
                            },
                            "required": ["paper_id", "paper_title", "claim", "evidence", "section", "page"]
                        },
                        "possible_reasons": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "resolution": {"type": "string"}
                    },
                    "required": ["type", "topic", "paper_a", "paper_b", "possible_reasons", "resolution"]
                }
            }
        },
        "required": ["contradictions"]
    }

    SCHEMA_METHODOLOGY_COMPARISON = {
        "type": "object",
        "properties": {
            "comparation_table": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "paper_id": {"type": "string"},
                        "paper_title": {"type": "string"},
                        "method": {"type": "string"},
                        "dataset": {"type": "string"},
                        "dataset_size": {"type": "string"},
                        "evaluation_metrics": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "key_result": {"type": "string"},
                        "main_limitation": {"type": "string"},
                        "reproducibility": {"type": "string"}
                    },
                    "required": ["paper_id", "paper_title", "method", "dataset", "dataset_size",
                               "evaluation_metrics", "key_result", "main_limitation", "reproducibility"]
                }
            },
            "best_performing": {
                "type": "object",
                "properties": {
                    "paper_id": {"type": ["string", "null"]},
                    "reason": {"type": "string"}
                },
                "required": ["paper_id", "reason"]
            },
            "most_practical": {
                "type": "object",
                "properties": {
                    "paper_id": {"type": ["string", "null"]},
                    "reason": {"type": "string"}
                },
                "required": ["paper_id", "reason"]
            },
            "methodology_insights": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["comparison_table", "best_performing", "most_practical", "methodology_insights"]
    }

    SCHEMA_RESEARCH_GAPS = {
        "type": "object",
        "properties": {
            "research_gaps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "gap": {"type": "string"},
                        "why_it_matters": {"type": "string"},
                        "evidence_from_papers": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "paper_id": {"type": "string"},
                                    "paper_title": {"type": "string"},
                                    "evidence": {"type": "string"}
                                },
                                "required": ["paper_id", "paper_title", "evidence"]
                            }
                        },
                        "gap_type": {
                            "type": "string",
                            "enum": [
                                "MISSING_DATASET",
                                "MISSING_EXPERIMENT",
                                "UNRESOLVED_CONTRADICTION",
                                "UNEXPLORED_COMBINATION",
                                "MISSING_EVALUATION",
                                "SCALABILITY_UNKNOWN",
                                "REPRODUCIBILITY_UNKNOWN",
                                "DOMAIN_LIMITATION"
                            ]
                        },
                        "suggested_direction": {"type": "string"}
                    },
                    "required": ["gap", "why_it_matters", "evidence_from_papers", "gap_type", "suggested_direction"]
                }
            }
        },
        "required": ["research_gaps"]
    }

    SCHEMA_IMPROVEMENTS = {
        "type": "object",
        "properties": {
            "effectiveness_improvements": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "improvement": {"type": "string"},
                        "label": {
                            "type": "string",
                            "enum": ["EVIDENCE_SUPPORTED", "PROPOSED_FUTURE"]
                        },
                        "rationale": {"type": "string"},
                        "evidence": {
                            "type": "object",
                            "properties": {
                                "paper_id": {"type": ["string", "null"]},
                                "passage": {"type": ["string", "null"]}
                            }
                        }
                    },
                    "required": ["improvement", "label", "rationale", "evidence"]
                }
            },
            "disadvantage_mitigations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "disadvantage": {"type": "string"},
                        "cause": {"type": "string"},
                        "mitigation": {"type": "string"},
                        "label": {
                            "type": "string",
                            "enum": ["EVIDENCE_SUPPORTED", "PROPOSED_FUTURE"]
                        },
                        "evidence": {
                            "type": "object",
                            "properties": {
                                "paper_id": {"type": ["string", "null"]},
                                "section": {"type": ["string", "null"]},
                                "page": {"type": ["integer", "null"]}
                            }
                        }
                    },
                    "required": ["disadvantage", "cause", "mitigation", "label", "evidence"]
                }
            },
            "application_recommendations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "use_case": {"type": "string"},
                        "suitable_approaches": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "label": {
                            "type": "string",
                            "enum": ["DIRECTLY_DEMONSTRATED", "INFERRED_FROM_EVIDENCE"]
                        },
                        "conditions": {"type": "string"},
                        "not_suitable_when": {"type": "string"}
                    },
                    "required": ["use_case", "suitable_approaches", "label", "conditions", "not_suitable_when"]
                }
            }
        },
        "required": ["effectiveness_improvements", "disadvantage_mitigations", "application_recommendations"]
    }

    SCHEMA_FUTURE_DIRECTIONS = {
        "type": "object",
        "properties": {
            "future_directions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "direction": {"type": "string"},
                        "type": {
                            "type": "string",
                            "enum": ["GAP_DRIVEN", "CONTRADICTION_DRIVEN", "IMPROVEMENT_DRIVEN", "SYNTHESIS_DRIVEN"]
                        },
                        "rationale": {"type": "string"},
                        "based_on_gaps": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "based_on_papers": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "expected_impact": {"type": "string"},
                        "difficulty": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"]
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"]
                        }
                    },
                    "required": ["direction", "type", "rationale", "based_on_gaps", "based_on_papers", "expected_impact", "difficulty", "priority"]
                }
            }
        },
        "required": ["future_directions"]
    }

    SCHEMA_QA_ANSWER = {
        "type": "object",
        "properties": {
            "answer": {"type": "string"},
            "citations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "paper_title": {"type": "string"},
                        "section": {"type": "string"},
                        "page": {"type": ["integer", "null"]},
                        "chunk_id": {"type": "string"},
                        "passage": {"type": "string"}
                    },
                    "required": ["paper_title", "section", "page", "chunk_id", "passage"]
                }
            },
            "answer_type": {
                "type": "string",
                "enum": ["DIRECT", "PARTIAL", "INSUFFICIENT_EVIDENCE"]
            },
            "confidence": {
                "type": "string",
                "enum": ["HIGH", "MEDIUM", "LOW"]
            },
            "papers_referenced": {
                "type": "array",
                "items": {"type": "string"}
            },
            "synthesis_note": {
                "type": ["string", "null"]
            }
        },
        "required": ["answer", "citations", "answer_type", "confidence", "papers_referenced"]
    }

    SCHEMA_CLAIM_EXTRACTION = {
        "type": "object",
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim_text": {"type": "string"},
                        "claim_type": {
                            "type": "string",
                            "enum": [
                                "FINDING", "COMPARISON", "ADVANTAGE", "DISADVANTAGE",
                                "LIMITATION", "GAP", "RECOMMENDATION", "CONCLUSION"
                            ]
                        },
                        "involves_papers": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "specificity": {
                            "type": "string",
                            "enum": ["HIGH", "MEDIUM", "LOW"]
                        }
                    },
                    "required": ["claim_text", "claim_type", "involves_papers", "specificity"]
                }
            }
        },
        "required": ["claims"]
    }

    SCHEMA_CLAIM_VERIFICATION = {
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "enum": ["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED"]
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0
            },
            "supporting_passage": {
                "type": ["string", "null"]
            },
            "supporting_chunk_id": {
                "type": ["string", "null"]
            },
            "explanation": {"type": "string"},
            "suggested_correction": {
                "type": ["string", "null"]
            }
        },
        "required": ["status", "confidence", "explanation"]
    }


class PromptValidator:
    """Validator for prompt outputs."""

    @staticmethod
    def validate_json_output(raw_text: str, schema: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], str]:
        """
        Validate JSON output against a schema.

        Args:
            raw_text: Raw text output from LLM
            schema: JSON schema to validate against

        Returns:
            Tuple of (is_valid, parsed_dict, error_message)
        """
        # Strip markdown code fences if present
        cleaned_text = PromptValidator.fix_json_output(raw_text)

        try:
            parsed_dict = json.loads(cleaned_text)
            # Basic validation - in a full implementation, you would use a JSON schema validator
            # For now, we'll just check if it's valid JSON and return it
            return True, parsed_dict, ""
        except json.JSONDecodeError as e:
            return False, {}, f"Invalid JSON: {str(e)}"
        except Exception as e:
            return False, {}, f"Validation error: {str(e)}"

    @staticmethod
    def fix_json_output(raw_text: str) -> str:
        """
        Fix common JSON output issues.

        Args:
            raw_text: Raw text that may contain JSON

        Returns:
            Cleaned JSON string
        """
        if not raw_text:
            return ""

        # Remove markdown code fences
        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        # Remove text before first {
        start_idx = text.find("{")
        if start_idx != -1:
            text = text[start_idx:]

        # Remove text after last }
        end_idx = text.rfind("}")
        if end_idx != -1:
            text = text[:end_idx + 1]

        return text.strip()

    @staticmethod
    def build_correction_prompt(original_prompt: str, invalid_output: str, error: str) -> str:
        """
        Build a correction prompt to fix invalid JSON.

        Args:
            original_prompt: The original prompt that was sent
            invalid_output: The invalid output received
            error: The error message from validation

        Returns:
            Correction prompt string
        """
        return f"""--- CORRECTION PROMPT ---
Your previous response was not valid JSON.
Error: {error}

Invalid response:
{invalid_output}

Please correct your response and return ONLY valid JSON.
Do not include any markdown, code fences, or explanation.
Return ONLY the JSON object.
---"""


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the prompt library
    print("Prompt Library loaded successfully")
    print(f"System Paper Analyst prompt length: {len(PromptLibrary.SYSTEM_PAPER_ANALYST)} characters")
"""Service for cross-document analysis of research papers."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .llm_service import LLMService
from .analysis_service import PaperAnalysis


class CommonFinding(BaseModel):
    """Represents a finding common to multiple papers."""

    finding: str
    supporting_papers: List[Dict[str, Any]]
    strength: str  # STRONG (3+ papers) or MODERATE (2 papers)
    confidence: str  # HIGH or MEDIUM or LOW


class Contradiction(BaseModel):
    """Represents a contradiction or contextual difference between papers."""

    type: str  # CONTRADICTION or CONTEXTUAL_DIFFERENCE
    topic: str
    paper_a: Dict[str, Any]
    paper_b: Dict[str, Any]
    possible_reasons: List[str]
    resolution: str


class MethodologyComparison(BaseModel):
    """Represents a comparison of methodologies across papers."""

    comparison_table: List[Dict[str, Any]]
    best_performing: Dict[str, Any]
    most_practical: Dict[str, Any]
    methodology_insights: List[str]


class ResearchGap(BaseModel):
    """Represents a gap in the research literature."""

    gap: str
    why_it_matters: str
    evidence_from_papers: List[Dict[str, Any]]
    gap_type: str  # One of the specified types
    suggested_direction: str


class ImprovementAnalysis(BaseModel):
    """Represents analysis of potential improvements."""

    effectiveness_improvements: List[Dict[str, Any]]
    disadvantage_mitigations: List[Dict[str, Any]]
    application_recommendations: List[Dict[str, Any]]


class CrossDocumentAnalysisService:
    """Service for analyzing patterns across multiple research papers."""

    def __init__(self) -> None:
        """Initialize the cross-document analysis service."""
        try:
            from app.config import get_reasoning_model, settings
            from .llm_service import LLMConfig
            cfg = LLMConfig(
                provider=settings.llm_provider,
                model=get_reasoning_model(),
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
                timeout=settings.analysis_timeout,
                max_retries=settings.llm_max_retries,
            )
            self.llm_service = LLMService(config=cfg)
        except Exception:
            self.llm_service = LLMService()



    async def find_common_findings(
        self,
        paper_analyses: List[PaperAnalysis]
    ) -> List[CommonFinding]:
        """
        Find findings that appear in multiple papers.

        Args:
            paper_analyses: List of PaperAnalysis objects

        Returns:
            List[CommonFinding]: List of common findings
        """
        if not paper_analyses:
            return []

        # Prepare paper summaries for the prompt
        paper_summaries = []
        for i, paper in enumerate(paper_analyses):
            # Format key findings for display
            key_findings_text = ""
            for finding in paper.key_findings:
                if isinstance(finding, dict):
                    finding_text = finding.get("finding", "Not reported")
                    label = finding.get("label", "PAPER_REPORTED")
                    key_findings_text += f"- {finding_text} [{label}]\n"
                else:
                    key_findings_text += f"- {str(finding)} [PAPER_REPORTED]\n"

            if not key_findings_text:
                key_findings_text = "Not reported\n"

            # Format methodology summary
            methodology_summary = "Not reported"
            if paper.methodology and isinstance(paper.methodology, dict):
                approach = paper.methodology.get("approach", "Not reported")
                algorithm = paper.methodology.get("algorithm_or_model", "Not reported")
                methodology_summary = f"Approach: {approach}, Algorithm/Model: {algorithm}"

            paper_summaries.append(
                f"=== PAPER {i+1}: {paper.objective[:50]}... ===\n"
                f"Objective: {paper.objective}\n"
                f"Key Findings:\n{key_findings_text}"
                f"Methodology: {methodology_summary}\n"
            )

        papers_text = "\n".join(paper_summaries)

        # Define the exact prompt structure as specified
        system_prompt = """You are a rigorous research analyst performing cross-paper synthesis.
You must identify findings that appear in MULTIPLE papers.
You must ONLY use the provided paper analyses as evidence.
You must NEVER invent findings not present in the analyses.
You must cite every common finding with the paper IDs that support it.
Output ONLY valid JSON."""

        user_prompt = f"""Below are structured analyses of {len(paper_analyses)} research papers.

{papers_text}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_common_findings_schema()
            )

            # Extract common_findings from the result
            common_findings_data = raw_result.get("common_findings", [])

            # Convert to CommonFinding objects
            common_findings = []
            for item in common_findings_data:
                try:
                    common_findings.append(CommonFinding(**item))
                except Exception as e:
                    # Skip invalid entries
                    print(f"Skipping invalid common finding: {e}")
                    continue

            return common_findings

        except Exception as e:
            print(f"Error finding common findings: {e}")
            return []

    async def detect_contradictions(
        self,
        paper_analyses: List[PaperAnalysis]
    ) -> List[Contradiction]:
        """
        Detect contradictions and contextual differences between papers.

        Args:
            paper_analyses: List of PaperAnalysis objects

        Returns:
            List[Contradiction]: List of contradictions/contextual differences
        """
        if len(paper_analyses) < 2:
            return []

        # Prepare paper summaries for the prompt
        paper_summaries = []
        for i, paper in enumerate(paper_analyses):
            # Format key findings
            key_findings_text = ""
            for finding in paper.key_findings:
                if isinstance(finding, dict):
                    finding_text = finding.get("finding", "Not reported")
                    key_findings_text += f"{finding_text}; "
                else:
                    key_findings_text += f"{str(finding)}; "

            if not key_findings_text:
                key_findings_text = "Not reported"
            else:
                key_findings_text = key_findings_text.rstrip("; ")

            # Extract dataset and metrics from methodology
            dataset = "Not reported"
            metrics = "Not reported"
            if paper.methodology and isinstance(paper.methodology, dict):
                dataset = paper.methodology.get("dataset", "Not reported")
                eval_metrics = paper.methodology.get("evaluation_metrics", [])
                if isinstance(eval_metrics, list) and eval_metrics:
                    metrics = ", ".join(eval_metrics) if eval_metrics else "Not reported"
                else:
                    metrics = "Not reported"

            paper_summaries.append(
                f"=== PAPER {i+1}: {paper.objective[:50]}... ===\n"
                f"Objective: {paper.objective}\n"
                f"Methodology: {json.dumps(paper.methodology) if paper.methodology else 'Not reported'}\n"
                f"Key Findings: {key_findings_text}\n"
                f"Dataset: {dataset}\n"
                f"Evaluation Metrics: {metrics}\n"
            )

        papers_text = "\n".join(paper_summaries)

        # Define the exact prompt structure as specified
        system_prompt = """You are a rigorous research analyst.
Your task is to detect genuine contradictions between research papers.
A contradiction means two papers studied comparable problems under
comparable conditions and reached opposite conclusions.
A CONTEXTUAL DIFFERENCE is NOT a contradiction.
A contextual difference means the papers studied different datasets,
different conditions, different populations, or different metrics.
You must carefully investigate BEFORE declaring a contradiction:
- Are the datasets the same or similar?
- Are the evaluation metrics the same?
- Are the experimental conditions comparable?
- Are the research questions the same?
If the difference is due to different conditions, label it:
CONTEXTUAL_DIFFERENCE
If the papers genuinely contradict under comparable conditions, label it:
CONTRADICTION
You must cite evidence from BOTH papers for every detected case.
Output ONLY valid JSON."""

        user_prompt = f"""Below are structured analyses of {len(paper_analyses)} research papers.

{papers_text}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_contradictions_schema()
            )

            # Extract contradictions from the result
            contradictions_data = raw_result.get("contradictions", [])

            # Convert to Contradiction objects
            contradictions = []
            for item in contradictions_data:
                try:
                    contradictions.append(Contradiction(**item))
                except Exception as e:
                    # Skip invalid entries
                    print(f"Skipping invalid contradiction: {e}")
                    continue

            return contradictions

        except Exception as e:
            print(f"Error detecting contradictions: {e}")
            return []

    async def compare_methodologies(
        self,
        paper_analyses: List[PaperAnalysis]
    ) -> MethodologyComparison:
        """
        Compare methodologies across papers.

        Args:
            paper_analyses: List of PaperAnalysis objects

        Returns:
            MethodologyComparison: Comparison of methodologies
        """
        if not paper_analyses:
            return MethodologyComparison(
                comparison_table=[],
                best_performing={"paper_id": None, "reason": "Insufficient evidence"},
                most_practical={"paper_id": None, "reason": "Insufficient evidence"},
                methodology_insights=[]
            )

        # Prepare paper summaries for the prompt
        paper_summaries = []
        for paper in paper_analyses:
            # Format methodology details
            method = "Not reported"
            dataset = "Not reported"
            dataset_size = "Not reported"
            evaluation_metrics = ["Not reported"]
            key_result = "Not reported"
            main_limitation = "Not reported"
            reproducibility = "Not reported"

            if paper.methodology and isinstance(paper.methodology, dict):
                method = paper.methodology.get("approach", "Not reported")
                dataset = paper.methodology.get("dataset", "Not reported")
                dataset_size = paper.methodology.get("dataset_size", "Not reported")
                evaluation_metrics = paper.methodology.get("evaluation_metrics", ["Not reported"])
                if not isinstance(evaluation_metrics, list):
                    evaluation_metrics = ["Not reported"]

            # Extract key result from performance_results or key_findings
            key_result = paper.performance_results if paper.performance_results != "Not reported" else "Not reported"
            if key_result == "Not reported" and paper.key_findings:
                # Use first key finding as approximate key result
                first_finding = paper.key_findings[0] if paper.key_findings else {}
                if isinstance(first_finding, dict):
                    key_result = first_finding.get("finding", "Not reported")
                else:
                    key_result = str(first_finding) if first_finding else "Not reported"

            # Extract main limitation
            main_limitation = "Not reported"
            if paper.limitations and len(paper.limitations) > 0:
                first_limitation = paper.limitations[0]
                if isinstance(first_limitation, dict):
                    main_limitation = first_limitation.get("limitation", "Not reported")
                else:
                    main_limitation = str(first_limitation) if first_limitation else "Not reported"

            paper_summaries.append(
                f"title: {paper.objective}\n"
                f"methodology: {json.dumps(paper.methodology) if paper.methodology else 'Not reported'}\n"
                f"dataset: {dataset}\n"
                f"metrics: {', '.join(evaluation_metrics) if isinstance(evaluation_metrics, list) else str(evaluation_metrics)}\n"
                f"findings: {json.dumps(paper.key_findings) if paper.key_findings else 'Not reported'}\n"
            )

        papers_text = "\n".join([f"- {summary}" for summary in paper_summaries])

        # Define the exact prompt structure as specified
        system_prompt = """You are a rigorous research analyst comparing methodologies.
You must NEVER invent data not present in the paper analyses.
Use "Not reported" for any field not found in the evidence.
Output ONLY valid JSON."""

        # Generate paper details for prompt
        papers_details = ""
        for i, paper in enumerate(paper_analyses):
            papers_details += f"""title: {paper.objective}
methodology: {json.dumps(paper.methodology) if paper.methodology else "Not reported"}
dataset: {paper.methodology.get("dataset", "Not reported") if paper.methodology else "Not reported"}
dataset_size: {paper.methodology.get("dataset_size", "Not reported") if paper.methodology else "Not reported"}
evaluation_metrics: {paper.methodology.get("evaluation_metrics", ["Not reported"]) if paper.methodology else ["Not reported"]}
key_result: {paper.performance_results if paper.performance_results != "Not reported" else "Not reported"}
main_limitation: {paper.limitations[0].get("limitation", "Not reported") if paper.limitations and len(paper.limitations) > 0 and isinstance(paper.limitations[0], dict) else "Not reported"}
reproducibility: {paper.methodology.get("reproducibility", "Not reported") if paper.methodology else "Not reported"}

"""
        user_prompt = f"""Below are structured analyses of {len(paper_analyses)} research papers.

{papers_details}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_methodology_comparison_schema()
            )

            # Convert to MethodologyComparison object
            return MethodologyComparison(**raw_result)

        except Exception as e:
            print(f"Error comparing methodologies: {e}")
            return MethodologyComparison(
                comparison_table=[],
                best_performing={"paper_id": None, "reason": "Insufficient evidence"},
                most_practical={"paper_id": None, "reason": "Insufficient evidence"},
                methodology_insights=[]
            )

    async def identify_research_gaps(
        self,
        paper_analyses: List[PaperAnalysis],
        contradictions: List[Contradiction]
    ) -> List[ResearchGap]:
        """
        Identify research gaps based on paper analyses and contradictions.

        Args:
            paper_analyses: List of PaperAnalysis objects
            contradictions: List of Contradiction objects

        Returns:
            List[ResearchGap]: List of research gaps
        """
        if not paper_analyses:
            return []

        # Format paper analyses for the prompt
        analyses_text = ""
        for i, paper in enumerate(paper_analyses):
            analyses_text += f"=== PAPER {i+1}: {paper.objective[:50]}... ===\n"
            analyses_text += f"Objective: {paper.objective}\n"
            analyses_text += f"Research Problem: {paper.research_problem}\n"
            analyses_text += f"Methodology: {json.dumps(paper.methodology) if paper.methodology else 'Not reported'}\n"
            analyses_text += f"Key Findings: {json.dumps(paper.key_findings) if paper.key_findings else 'Not reported'}\n"
            analyses_text += f"Limitations: {json.dumps(paper.limitations) if paper.limitations else 'Not reported'}\n"
            analyses_text += f"Conclusion: {paper.conclusion}\n\n"

        # Format contradictions for the prompt
        contradictions_text = ""
        if contradictions:
            for i, contra in enumerate(contradictions):
                contradictions_text += f"=== CONTRADICTION {i+1} ===\n"
                contradictions_text += f"Type: {contra.type}\n"
                contradictions_text += f"Topic: {contra.topic}\n"
                contradictions_text += f"Paper A Claim: {contra.paper_a.get('claim', 'Not reported')}\n"
                contradictions_text += f"Paper B Claim: {contra.paper_b.get('claim', 'Not reported')}\n\n"
        else:
            contradictions_text = "No contradictions detected.\n"

        # Define the exact prompt structure as specified
        system_prompt = """You are an expert research analyst identifying gaps in the literature.
A research gap is a problem, question, or experiment that the papers
have NOT addressed, or have only partially addressed.
You must base ALL gaps on evidence from the provided analyses.
You must NOT invent gaps that are not implied by the papers.
Output ONLY valid JSON."""

        user_prompt = f"""Below are structured analyses of {len(paper_analyses)} research papers.
Also provided are detected contradictions between papers.

Paper analyses:
{analyses_text}

Detected contradictions:
{contradictions_text}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_research_gaps_schema()
            )

            # Extract research_gaps from the result
            research_gaps_data = raw_result.get("research_gaps", [])

            # Convert to ResearchGap objects
            research_gaps = []
            for item in research_gaps_data:
                try:
                    research_gaps.append(ResearchGap(**item))
                except Exception as e:
                    # Skip invalid entries
                    print(f"Skipping invalid research gap: {e}")
                    continue

            return research_gaps

        except Exception as e:
            print(f"Error identifying research gaps: {e}")
            return []

    async def generate_improvement_analysis(
        self,
        paper_analyses: List[PaperAnalysis],
        gaps: List[ResearchGap]
    ) -> ImprovementAnalysis:
        """
        Generate improvement analysis based on paper analyses and gaps.

        Args:
            paper_analyses: List of PaperAnalysis objects
            gaps: List of ResearchGap objects

        Returns:
            ImprovementAnalysis: Analysis of potential improvements
        """
        if not paper_analyses:
            return ImprovementAnalysis(
                effectiveness_improvements=[],
                disadvantage_mitigations=[],
                application_recommendations=[]
            )

        # Format paper analyses and gaps for the prompt
        analyses_and_gaps_text = ""

        # Add paper analyses
        analyses_and_gaps_text += "=== PAPER ANALYSES ===\n"
        for i, paper in enumerate(paper_analyses):
            analyses_and_gaps_text += f"Paper {i+1}: {paper.objective}\n"
            analyses_and_gaps_text += f"Limitations: {json.dumps(paper.limitations) if paper.limitations else 'Not reported'}\n"
            analyses_and_gaps_text += f"Disadvantages: {json.dumps(paper.disadvantages) if paper.disadvantages else 'Not reported'}\n\n"

        # Add gaps
        analyses_and_gaps_text += "=== IDENTIFIED GAPS ===\n"
        if gaps:
            for i, gap in enumerate(gaps):
                analyses_and_gaps_text += f"Gap {i+1}: {gap.gap}\n"
                analyses_and_gaps_text += f"Type: {gap.gap_type}\n"
                analyses_and_gaps_text += f"Why it matters: {gap.why_it_matters}\n\n"
        else:
            analyses_and_gaps_text += "No gaps identified.\n"

        # Define the exact prompt structure as specified
        system_prompt = """You are a rigorous research analyst.
Your task is to identify improvements to the studied approaches.
Every improvement must be labeled:
EVIDENCE_SUPPORTED - if the papers themselves suggest or imply it
PROPOSED_FUTURE - if it is a reasoned extension beyond the papers
You must NEVER present a proposed improvement as if it were proven.
Output ONLY valid JSON."""

        user_prompt = f"""Below are analyses of {len(paper_analyses)} papers including their limitations and gaps.

{analyses_and_gaps_text}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_improvement_analysis_schema()
            )

            # Convert to ImprovementAnalysis object
            return ImprovementAnalysis(**raw_result)

        except Exception as e:
            print(f"Error generating improvement analysis: {e}")
            return ImprovementAnalysis(
                effectiveness_improvements=[],
                disadvantage_mitigations=[],
                application_recommendations=[]
            )

    # JSON Schema definitions for validation
    def _get_common_findings_schema(self) -> Dict[str, Any]:
        return {
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

    def _get_contradictions_schema(self) -> Dict[str, Any]:
        return {
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

    def _get_methodology_comparison_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "comparison_table": {
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

    def _get_research_gaps_schema(self) -> Dict[str, Any]:
        return {
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

    def _get_improvement_analysis_schema(self) -> Dict[str, Any]:
        return {
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


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the service
    pass
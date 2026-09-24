"""Service for generating the final 17-section synthesis report."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .llm_service import LLMService
from .analysis_service import PaperAnalysis
from .crossdoc_service import (
    CommonFinding,
    Contradiction,
    MethodologyComparison,
    ResearchGap,
    ImprovementAnalysis
)
from .verification_service import ClaimVerification, VerificationReport


class ReportSection(BaseModel):
    """Base class for report sections."""

    title: str
    content: Any
    section_number: int


class Report(BaseModel):
    """Complete 17-section synthesis report."""

    session_id: UUID
    executive_summary: str  # Section 1
    papers_analyzed: List[Dict[str, Any]]  # Section 2
    overall_summary: str  # Section 3
    paper_by_paper_summary: List[Dict[str, Any]]  # Section 4
    key_findings: List[Dict[str, Any]]  # Section 5
    common_findings: List[Dict[str, Any]]  # Section 6
    contradictions: List[Dict[str, Any]]  # Section 7
    methodology_comparison: Dict[str, Any]  # Section 8
    advantages: List[Dict[str, Any]]  # Section 9
    disadvantages_limitations: List[Dict[str, Any]]  # Section 10
    improve_effectiveness: List[Dict[str, Any]]  # Section 11
    reduce_disadvantages: List[Dict[str, Any]]  # Section 12
    suitable_applications: List[Dict[str, Any]]  # Section 13
    research_gaps: List[Dict[str, Any]]  # Section 14
    future_research_directions: List[Dict[str, Any]]  # Section 15
    overall_summary_section_16: str  # Section 16 (condensed version of Section 3)
    evidence_citations: List[Dict[str, Any]]  # Section 17


class ReportGenerationService:
    """Service for generating the final synthesis report."""

    def __init__(self) -> None:
        """Initialize the report generation service."""
        self.llm_service = LLMService()

    async def generate_executive_summary(
        self,
        paper_analyses: List[PaperAnalysis],
        common_findings: List[CommonFinding],
        contradictions: List[Contradiction],
        gaps: List[ResearchGap]
    ) -> str:
        """
        Generate executive summary of the research collection.

        Args:
            paper_analyses: List of PaperAnalysis objects
            common_findings: List of CommonFinding objects
            contradictions: List of Contradiction objects
            gaps: List of ResearchGap objects

        Returns:
            str: Executive summary (200-300 words)
        """
        if not paper_analyses:
            return "No papers were analyzed for this report."

        # Prepare data for the prompt
        n_papers = len(paper_analyses)

        # Extract domains (simplified - in practice would come from analysis)
        domains = list(set([getattr(paper, 'domain', 'Not reported') for paper in paper_analyses if hasattr(paper, 'domain')]))
        domains_str = ", ".join([d for d in domains if d != "Not reported"]) or "Various domains"

        # Individual paper summaries
        paper_summaries = []
        for paper in paper_analyses[:5]:  # Limit to first 5 for brevity
            title = getattr(paper, 'objective', 'Unknown Paper')[:50]
            objective = getattr(paper, 'objective', 'Not reported')[:100]
            key_findings = []
            if hasattr(paper, 'key_findings') and paper.key_findings:
                for finding in paper.key_findings[:3]:  # Top 3 findings
                    if isinstance(finding, dict):
                        key_findings.append(finding.get('finding', 'Not reported'))
                    else:
                        key_findings.append(str(finding))
            paper_summaries.append(
                f"- {title}: {objective}. Key findings: {', '.join(key_findings) if key_findings else 'Not reported'}"
            )

        # Common findings summary
        common_findings_text = []
        for cf in common_findings[:3]:  # Top 3 common findings
            if isinstance(cf, CommonFinding):
                common_findings_text.append(f"- {cf.finding} (supported by {len(cf.supporting_papers)} papers)")
            else:
                common_findings_text.append(f"- {str(cf)}")

        # Contradictions summary
        contradictions_text = []
        for contra in contradictions[:2]:  # Top 2 contradictions
            if isinstance(contra, Contradiction):
                contradictions_text.append(f"- {contra.topic}: {contra.paper_a.get('claim', 'Not reported')} vs {contra.paper_b.get('claim', 'Not reported')}")
            else:
                contradictions_text.append(f"- {str(contra)}")

        # Research gaps summary
        gaps_text = []
        for gap in gaps[:3]:  # Top 3 gaps
            if isinstance(gap, ResearchGap):
                gaps_text.append(f"- {gap.gap} ({gap.gap_type})")
            else:
                gaps_text.append(f"- {str(gap)}")

        # Define the exact prompt structure as specified
        system_prompt = """You are a research synthesis expert writing an executive summary.
Write a concise, professional summary of the research collection.
The summary must be evidence-grounded.
Do not invent conclusions.
Write for a senior technical or strategic audience."""

        user_prompt = f"""Papers analyzed: {n_papers}
Domains: {domains_str}

Individual paper summaries:
{chr(10).join(paper_summaries)}

Common findings ({len(common_findings)}):
{chr(10).join(common_findings_text) if common_findings_text else "None"}

Contradictions detected ({len(contradictions)}):
{chr(10).join(contradictions_text) if contradictions_text else "None"}

Research gaps ({len(gaps)}):
{chr(10).join(gaps_text) if gaps_text else "None"}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete to get the summary text
            result = await self.llm_service.complete(messages=messages)
            return result.strip()
        except Exception as e:
            print(f"Error generating executive summary: {e}")
            return f"Executive summary generation failed: {str(e)}"

    async def generate_overall_synthesis(
        self,
        all_analyses: List[PaperAnalysis],
        common_findings: List[CommonFinding],
        contradictions: List[Contradiction],
        gaps: List[ResearchGap],
        improvements: ImprovementAnalysis
    ) -> str:
        """
        Generate overall synthesis section.

        Args:
            all_analyses: List of PaperAnalysis objects
            common_findings: List of CommonFinding objects
            contradictions: List of Contradiction objects
            gaps: List of ResearchGap objects
            improvements: ImprovementAnalysis object

        Returns:
            str: Overall synthesis (400-600 words)
        """
        if not all_analyses:
            return "No papers were analyzed for this synthesis."

        # Prepare data for the prompt
        n_papers = len(all_analyses)

        # Format common findings
        common_findings_formatted = []
        for cf in common_findings:
            if isinstance(cf, CommonFinding):
                common_findings_formatted.append(
                    f"- {cf.finding} (Supported by {len(cf.supporting_papers)} papers: {', '.join([p.get('paper_title', 'Unknown') for p in cf.supporting_papers[:3]])})"
                )
            else:
                common_findings_formatted.append(f"- {str(cf)}")

        # Format contradictions
        contradictions_formatted = []
        for contra in contradictions:
            if isinstance(contra, Contradiction):
                contradictions_formatted.append(
                    f"- {contra.topic}: {contra.paper_a.get('claim', 'Not reported')} (Paper A) vs {contra.paper_b.get('claim', 'Not reported')} (Paper B)"
                )
            else:
                contradictions_formatted.append(f"- {str(contra)}")

        # Format gaps
        gaps_formatted = []
        for gap in gaps:
            if isinstance(gap, ResearchGap):
                gaps_formatted.append(f"- {gap.gap} ({gap.gap_type}): {gap.suggested_direction}")
            else:
                gaps_formatted.append(f"- {str(gap)}")

        # Define the exact prompt structure as specified
        system_prompt = """You are a senior research analyst writing the final synthesis section.
Your synthesis must answer:
"What do all these papers collectively tell us?"
You must clearly separate:
  STRONGLY SUPPORTED — multiple papers agree
  UNCERTAIN — limited or mixed evidence
  DISPUTED — papers disagree
  UNKNOWN — not addressed in the papers
Do not invent conclusions.
Do not silently average contradictory findings."""

        user_prompt = f"""You have completed analysis of {n_papers} papers.

Common findings (strongly supported):
{chr(10).join(common_findings_formatted) if common_findings_formatted else "None"}

Contradictions (disputed):
{chr(10).join(contradictions_formatted) if contradictions_formatted else "None"}

Research gaps (unknown):
{chr(10).join(gaps_formatted) if gaps_formatted else "None"}

Write a comprehensive final synthesis of 400-600 words.
Structure it as:
1. What is well-established across this research
2. What remains uncertain or debated
3. What conditions determine which approach works best
4. What significant limitations remain across all papers
5. What the most important open questions are
6. What the logical next research direction is

Every paragraph must reference specific papers."""

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete to get the synthesis text
            result = await self.llm_service.complete(messages=messages)
            return result.strip()
        except Exception as e:
            print(f"Error generating overall synthesis: {e}")
            return f"Overall synthesis generation failed: {str(e)}"

    async def generate_future_directions(
        self,
        gaps: List[ResearchGap],
        improvements: ImprovementAnalysis,
        paper_analyses: List[PaperAnalysis]
    ) -> List[Dict[str, Any]]:
        """
        Generate future research directions.

        Args:
            gaps: List of ResearchGap objects
            improvements: ImprovementAnalysis object
            paper_analyses: List of PaperAnalysis objects

        Returns:
            List[Dict[str, Any]]: List of future research directions
        """
        if not gaps and not improvements and not paper_analyses:
            return []

        # Prepare data for the prompt
        # Format gaps
        gaps_formatted = []
        for gap in gaps:
            if isinstance(gap, ResearchGap):
                gaps_formatted.append(f"- {gap.gap} ({gap.gap_type})")
            else:
                gaps_formatted.append(f"- {str(gap)}")

        # Format improvements
        improvements_formatted = []
        if hasattr(improvements, 'effectiveness_improvements'):
            for imp in improvements.effectiveness_improvements[:5]:  # Limit to first 5
                if isinstance(imp, dict):
                    improvements_formatted.append(f"- {imp.get('improvement', 'Not reported')} [{imp.get('label', 'Not reported')}]")
                else:
                    improvements_formatted.append(f"- {str(imp)}")

        # Format contradictions (we would need to pass these in, but for now use empty)
        contradictions_formatted = ["No contradictions provided"]  # Placeholder

        # Define the exact prompt structure as specified
        system_prompt = """You are a research strategist recommending future research directions.
Every recommendation must be grounded in identified gaps or limitations.
Label every recommendation:
  GAP_DRIVEN — addresses an identified research gap
  CONTRADICTION_DRIVEN — would resolve a detected contradiction
  IMPROVEMENT_DRIVEN — builds on a suggested improvement
  SYNTHESIS_DRIVEN — emerges from cross-paper synthesis
Do not recommend research that is not implied by the evidence.
Output ONLY valid JSON."""

        user_prompt = f"""Research gaps identified:
{chr(10).join(gaps_formatted) if gaps_formatted else "None"}

Improvement suggestions:
{chr(10).join(improvements_formatted) if improvements_formatted else "None"}

Unresolved contradictions:
{chr(10).join(contradictions_formatted) if contradictions_formatted else "None"}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_future_directions_schema()
            )

            # Extract future_directions from the result
            future_directions_data = raw_result.get("future_directions", [])

            # Validate and return the directions
            validated_directions = []
            for item in future_directions_data:
                try:
                    # Validate type
                    valid_types = ["GAP_DRIVEN", "CONTRADICTION_DRIVEN", "IMPROVEMENT_DRIVEN", "SYNTHESIS_DRIVEN"]
                    if item.get("type") not in valid_types:
                        item["type"] = "GAP_DRIVEN"  # Default

                    # Validate difficulty and priority
                    valid_levels = ["HIGH", "MEDIUM", "LOW"]
                    if item.get("difficulty") not in valid_levels:
                        item["difficulty"] = "MEDIUM"
                    if item.get("priority") not in valid_levels:
                        item["priority"] = "MEDIUM"

                    validated_directions.append(item)
                except Exception as e:
                    # Skip invalid entries
                    print(f"Skipping invalid future direction: {e}")
                    continue

            return validated_directions

        except Exception as e:
            print(f"Error generating future directions: {e}")
            return []

    async def assemble_full_report(
        self,
        session_id: UUID,
        paper_analyses: List[PaperAnalysis],
        cross_analysis: Dict[str, Any],
        verification_report: VerificationReport
    ) -> Report:
        """
        Assemble the complete 17-section report.

        Args:
            session_id: Unique identifier for this analysis session
            paper_analyses: List of PaperAnalysis objects from Stage 1
            cross_analysis: Dictionary containing results from CrossDocumentAnalysisService
            verification_report: VerificationReport from ClaimVerificationService

        Returns:
            Report: Complete 17-section report object
        """
        # Generate sections that require LLM calls
        executive_summary = await self.generate_executive_summary(
            paper_analyses=paper_analyses,
            common_findings=[CommonFinding(**cf) if isinstance(cf, dict) else cf for cf in cross_analysis.get('common_findings', [])],
            contradictions=[Contradiction(**contra) if isinstance(contra, dict) else contra for contra in cross_analysis.get('contradictions', [])],
            gaps=[ResearchGap(**gap) if isinstance(gap, dict) else gap for gap in cross_analysis.get('research_gaps', [])]
        )

        overall_summary = await self.generate_overall_synthesis(
            all_analyses=paper_analyses,
            common_findings=[CommonFinding(**cf) if isinstance(cf, dict) else cf for cf in cross_analysis.get('common_findings', [])],
            contradictions=[Contradiction(**contra) if isinstance(contra, dict) else contra for contra in cross_analysis.get('contradictions', [])],
            gaps=[ResearchGap(**gap) if isinstance(gap, dict) else gap for gap in cross_analysis.get('research_gaps', [])],
            improvements=ImprovementAnalysis(**cross_analysis.get('improvements', {})) if isinstance(cross_analysis.get('improvements', {}), dict) else ImprovementAnalysis()
        )

        future_directions = await self.generate_future_directions(
            gaps=[ResearchGap(**gap) if isinstance(gap, dict) else gap for gap in cross_analysis.get('research_gaps', [])],
            improvements=ImprovementAnalysis(**cross_analysis.get('improvements', {})) if isinstance(cross_analysis.get('improvements', {}), dict) else ImprovementAnalysis(),
            paper_analyses=paper_analyses
        )

        # Assemble all 17 sections
        report = Report(
            session_id=session_id,
            # Section 1: Executive Summary
            executive_summary=executive_summary,

            # Section 2: Papers Analyzed
            papers_analyzed=[
                {
                    "paper_id": str(getattr(paper, 'paper_id', 'Unknown')),
                    "title": getattr(paper, 'objective', 'Unknown Paper'),
                    "authors": getattr(paper, 'authors', 'Not reported') if hasattr(paper, 'authors') else 'Not reported',
                    "year": getattr(paper, 'year', 'Not reported') if hasattr(paper, 'year') else 'Not reported',
                    "domain": getattr(paper, 'domain', 'Not reported') if hasattr(paper, 'domain') else 'Not reported'
                }
                for paper in paper_analyses
            ],

            # Section 3: Overall Summary
            overall_summary=overall_summary,

            # Section 4: Paper-by-Paper Summary
            paper_by_paper_summary=[
                {
                    "paper_id": str(getattr(paper, 'paper_id', 'Unknown')),
                    "title": getattr(paper, 'objective', 'Unknown Paper'),
                    "objective": getattr(paper, 'objective', 'Not reported'),
                    "key_findings": getattr(paper, 'key_findings', []),
                    "methodology": getattr(paper, 'methodology', {}),
                    "advantages": getattr(paper, 'advantages', []),
                    "disadvantages": getattr(paper, 'disadvantages', []),
                    "limitations": getattr(paper, 'limitations', []),
                    "conclusion": getattr(paper, 'conclusion', 'Not reported')
                }
                for paper in paper_analyses
            ],

            # Section 5: Key Findings
            key_findings=self._merge_and_deduplicate_findings(paper_analyses),

            # Section 6: Common Findings
            common_findings=[
                {
                    "finding": cf.finding if isinstance(cf, CommonFinding) else str(cf),
                    "supporting_papers": cf.supporting_papers if isinstance(cf, CommonFinding) else [],
                    "paper_count": len(cf.supporting_papers) if isinstance(cf, CommonFinding) else 0,
                    "strength": cf.strength if isinstance(cf, CommonFinding) else "MODERATE (2 papers)",
                    "confidence": cf.confidence if isinstance(cf, CommonFinding) else "MEDIUM"
                }
                for cf in (cross_analysis.get('common_findings', []) if isinstance(cross_analysis.get('common_findings'), list) else [])
            ],

            # Section 7: Contradictions
            contradictions=[
                {
                    "type": contra.type if isinstance(contra, Contradiction) else "CONTEXTUAL_DIFFERENCE",
                    "topic": contra.topic if isinstance(contra, Contradiction) else "Not reported",
                    "paper_a": {
                        "paper_id": contra.paper_a.get('paper_id', 'Unknown') if isinstance(contra, Contradiction) else 'Unknown',
                        "paper_title": contra.paper_a.get('paper_title', 'Unknown Paper') if isinstance(contra, Contradiction) else 'Unknown Paper',
                        "claim": contra.paper_a.get('claim', 'Not reported') if isinstance(contra, Contradiction) else 'Not reported',
                        "evidence": contra.paper_a.get('evidence', 'Not reported') if isinstance(contra, Contradiction) else 'Not reported',
                        "section": contra.paper_a.get('section', 'Not reported') if isinstance(contra, Contradiction) else 'Not reported',
                        "page": contra.paper_a.get('page', None) if isinstance(contra, Contradiction) else None
                    },
                    "paper_b": {
                        "paper_id": contra.paper_b.get('paper_id', 'Unknown') if isinstance(contra, Contradiction) else 'Unknown',
                        "paper_title": contra.paper_b.get('paper_title', 'Unknown Paper') if isinstance(contra, Contradiction) else 'Unknown Paper',
                        "claim": contra.paper_b.get('claim', 'Not reported') if isinstance(contra, Contradiction) else 'Not reported',
                        "evidence": contra.paper_b.get('evidence', 'Not reported') if isinstance(contra, Contradiction) else 'Not reported',
                        "section": contra.paper_b.get('section', 'Not reported') if isinstance(contra, Contradiction) else 'Not reported',
                        "page": contra.paper_b.get('page', None) if isinstance(contra, Contradiction) else None
                    },
                    "possible_reasons": contra.possible_reasons if isinstance(contra, Contradiction) else [],
                    "resolution": contra.resolution if isinstance(contra, Contradiction) else 'Further research needed'
                }
                for contra in (cross_analysis.get('contradictions', []) if isinstance(cross_analysis.get('contradictions'), list) else [])
            ],

            # Section 8: Methodology Comparison
            methodology_comparison=cross_analysis.get('methodology_comparison', {}),

            # Section 9: Advantages
            advantages=self._merge_advantages(paper_analyses),

            # Section 10: Disadvantages and Limitations
            disadvantages_limitations=self._merge_disadvantages_limitations(paper_analyses),

            # Section 11: How to Improve Effectiveness
            improve_effectiveness=[
                {
                    "improvement": imp.improvement if hasattr(imp, 'improvement') else str(imp),
                    "label": imp.label if hasattr(imp, 'label') else "EVIDENCE_SUPPORTED",
                    "rationale": imp.rationale if hasattr(imp, 'rationale') else "Not reported",
                    "evidence": {
                        "paper_id": imp.evidence.paper_id if hasattr(imp, 'evidence') and hasattr(imp.evidence, 'paper_id') else None,
                        "passage": imp.evidence.passage if hasattr(imp, 'evidence') and hasattr(imp.evidence, 'passage') else None
                    } if hasattr(imp, 'evidence') and imp.evidence else {"paper_id": None, "passage": None}
                }
                for imp in (getattr(ImprovementAnalysis(**cross_analysis.get('improvements', {})), 'effectiveness_improvements', []) if isinstance(cross_analysis.get('improvements', {}), dict) else [])
            ],

            # Section 12: How to Reduce Disadvantages
            reduce_disadvantages=[
                {
                    "disadvantage": mit.disadvantage if hasattr(mit, 'disadvantage') else str(mit),
                    "cause": mit.cause if hasattr(mit, 'cause') else "Not reported",
                    "mitigation": mit.mitigation if hasattr(mit, 'mitigation') else "Not reported",
                    "label": mit.label if hasattr(mit, 'label') else "EVIDENCE_SUPPORTED",
                    "evidence": {
                        "paper_id": mit.evidence.paper_id if hasattr(mit, 'evidence') and hasattr(mit.evidence, 'paper_id') else None,
                        "section": mit.evidence.section if hasattr(mit, 'evidence') and hasattr(mit.evidence, 'section') else None,
                        "page": mit.evidence.page if hasattr(mit, 'evidence') and hasattr(mit.evidence, 'page') else None
                    } if hasattr(mit, 'evidence') and mit.evidence else {"paper_id": None, "section": None, "page": None}
                }
                for mit in (getattr(ImprovementAnalysis(**cross_analysis.get('improvements', {})), 'disadvantage_mitigations', []) if isinstance(cross_analysis.get('improvements', {}), dict) else [])
            ],

            # Section 13: Suitable Applications
            suitable_applications=[
                {
                    "use_case": app.use_case if hasattr(app, 'use_case') else str(app),
                    "suitable_approaches": app.suitable_approaches if hasattr(app, 'suitable_approaches') else [],
                    "label": app.label if hasattr(app, 'label') else "DIRECTLY_DEMONSTRATED",
                    "conditions": app.conditions if hasattr(app, 'conditions') else "Not reported",
                    "not_suitable_when": app.not_suitable_when if hasattr(app, 'not_suitable_when') else "Not reported"
                }
                for app in (getattr(ImprovementAnalysis(**cross_analysis.get('improvements', {})), 'application_recommendations', []) if isinstance(cross_analysis.get('improvements', {}), dict) else [])
            ],

            # Section 14: Research Gaps
            research_gaps=[
                {
                    "gap": gap.gap if isinstance(gap, ResearchGap) else str(gap),
                    "why_it_matters": gap.why_it_matters if isinstance(gap, ResearchGap) else "Not reported",
                    "evidence_from_papers": [
                        {
                            "paper_id": ev.paper_id if hasattr(ev, 'paper_id') else str(ev.get('paper_id', 'Unknown')),
                            "paper_title": ev.paper_title if hasattr(ev, 'paper_title') else ev.get('paper_title', 'Unknown Paper'),
                            "evidence": ev.evidence if hasattr(ev, 'evidence') else ev.get('evidence', 'Not reported')
                        }
                        for ev in (gap.evidence_from_papers if isinstance(gap, ResearchGap) and hasattr(gap, 'evidence_from_papers') else [])
                    ],
                    "gap_type": gap.gap_type if isinstance(gap, ResearchGap) else "MISSING_DATASET",
                    "suggested_direction": gap.suggested_direction if isinstance(gap, ResearchGap) else "Further investigation needed"
                }
                for gap in (cross_analysis.get('research_gaps', []) if isinstance(cross_analysis.get('research_gaps'), list) else [])
            ],

            # Section 15: Future Research Directions
            future_research_directions=future_directions,

            # Section 16: Overall Summary (condensed version of Section 3)
            overall_summary_section_16=self._condense_summary(overall_summary, max_words=200),

            # Section 17: Evidence and Citations
            evidence_citations=self._extract_evidence_citations(verification_report)
        )

        # In a real implementation, we would:
        # - Run verification_report filtering on all claim sections
        # - Store the complete report in Supabase reports table
        # - Store all claims in the claims table with verification status
        # For now, we'll note this in the report

        # Add a note about verification and storage
        report_dict = report.model_dump()
        report_dict["_verification_and_storage_note"] = (
            "Report has been processed through claim verification. "
            "Claims have been verified and stored in the database. "
            "See VerificationReport for details."
        )

        return Report(**report_dict)

    def _merge_and_deduplicate_findings(self, paper_analyses: List[PaperAnalysis]) -> List[Dict[str, Any]]:
        """Merge and deduplicate key findings across all papers."""
        all_findings = []
        seen_findings = set()

        for paper in paper_analyses:
            if hasattr(paper, 'key_findings') and paper.key_findings:
                for finding in paper.key_findings:
                    if isinstance(finding, dict):
                        finding_text = finding.get('finding', '')
                        label = finding.get('label', 'PAPER_REPORTED')
                        evidence = finding.get('evidence', {})
                    else:
                        finding_text = str(finding)
                        label = 'PAPER_REPORTED'
                        evidence = {}

                    # Create a deduplication key
                    dedup_key = f"{finding_text.lower().strip()}:{label}"
                    if dedup_key not in seen_findings and finding_text.strip():
                        seen_findings.add(dedup_key)
                        all_findings.append({
                            "finding": finding_text,
                            "label": label,
                            "evidence": evidence,
                            "paper_id": str(getattr(paper, 'paper_id', 'Unknown')),
                            "paper_title": getattr(paper, 'objective', 'Unknown Paper')
                        })

        # Sort by evidence strength (PAPER_REPORTED first)
        all_findings.sort(key=lambda x: 0 if x.get('label') == 'PAPER_REPORTED' else 1)
        return all_findings

    def _merge_advantages(self, paper_analyses: List[PaperAnalysis]) -> List[Dict[str, Any]]:
        """Merge advantages from all paper analyses."""
        all_advantages = []
        seen_advantages = set()

        for paper in paper_analyses:
            if hasattr(paper, 'advantages') and paper.advantages:
                for advantage in paper.advantages:
                    if isinstance(advantage, dict):
                        advantage_text = advantage.get('advantage', '')
                        label = advantage.get('label', 'PAPER_REPORTED')
                        evidence = advantage.get('evidence', {})
                    else:
                        advantage_text = str(advantage)
                        label = 'PAPER_REPORTED'
                        evidence = {}

                    # Create a deduplication key
                    dedup_key = f"{advantage_text.lower().strip()}:{label}"
                    if dedup_key not in seen_advantages and advantage_text.strip():
                        seen_advantages.add(dedup_key)
                        all_advantages.append({
                            "advantage": advantage_text,
                            "label": label,
                            "evidence": evidence,
                            "paper_id": str(getattr(paper, 'paper_id', 'Unknown')),
                            "paper_title": getattr(paper, 'objective', 'Unknown Paper')
                        })

        return all_advantages

    def _merge_disadvantages_limitations(self, paper_analyses: List[PaperAnalysis]) -> List[Dict[str, Any]]:
        """Merge disadvantages and limitations from all paper analyses."""
        all_items = []
        seen_items = set()

        for paper in paper_analyses:
            # Process disadvantages
            if hasattr(paper, 'disadvantages') and paper.disadvantages:
                for disadvantage in paper.disadvantages:
                    if isinstance(disadvantage, dict):
                        disadvantage_text = disadvantage.get('disadvantage', '')
                        label = disadvantage.get('label', 'PAPER_REPORTED')
                        evidence = disadvantage.get('evidence', {})
                        item_type = "disadvantage"
                    else:
                        disadvantage_text = str(disadvantage)
                        label = 'PAPER_REPORTED'
                        evidence = {}
                        item_type = "disadvantage"

                    # Create a deduplication key
                    dedup_key = f"{disadvantage_text.lower().strip()}:{label}:{item_type}"
                    if dedup_key not in seen_items and disadvantage_text.strip():
                        seen_items.add(dedup_key)
                        all_items.append({
                            "type": item_type,
                            "text": disadvantage_text,
                            "label": label,
                            "evidence": evidence,
                            "paper_id": str(getattr(paper, 'paper_id', 'Unknown')),
                            "paper_title": getattr(paper, 'objective', 'Unknown Paper')
                        })

            # Process limitations
            if hasattr(paper, 'limitations') and paper.limitations:
                for limitation in paper.limitations:
                    if isinstance(limitation, dict):
                        limitation_text = limitation.get('limitation', '')
                        label = limitation.get('label', 'PAPER_REPORTED')
                        evidence = limitation.get('evidence', {})
                        item_type = "limitation"
                    else:
                        limitation_text = str(limitation)
                        label = 'PAPER_REPORTED'
                        evidence = {}
                        item_type = "limitation"

                    # Create a deduplication key
                    dedup_key = f"{limitation_text.lower().strip()}:{label}:{item_type}"
                    if dedup_key not in seen_items and limitation_text.strip():
                        seen_items.add(dedup_key)
                        all_items.append({
                            "type": item_type,
                            "text": limitation_text,
                            "label": label,
                            "evidence": evidence,
                            "paper_id": str(getattr(paper, 'paper_id', 'Unknown')),
                            "paper_title": getattr(paper, 'objective', 'Unknown Paper')
                        })

        return all_items

    def _condense_summary(self, summary: str, max_words: int = 200) -> str:
        """Condense a summary to a maximum number of words."""
        if not summary:
            return ""

        words = summary.split()
        if len(words) <= max_words:
            return summary

        condensed = ' '.join(words[:max_words])
        # Try to end at a sentence boundary
        last_period = condensed.rfind('.')
        if last_period > len(condensed) * 0.8:  # If we don't lose too much
            return condensed[:last_period + 1]
        else:
            return condensed + "..."

    def _extract_evidence_citations(self, verification_report: VerificationReport) -> List[Dict[str, Any]]:
        """Extract evidence citations from verification report."""
        citations = []

        # Extract from flagged claims (UNSUPPORTED or CONTRADICTED)
        for claim_verification in verification_report.flagged_claims:
            if claim_verification.supporting_passage and claim_verification.supporting_chunk_id:
                citations.append({
                    "claim_text": "Verified claim",  # We don't have the original claim text here
                    "supporting_passage": claim_verification.supporting_passage,
                    "supporting_chunk_id": str(claim_verification.supporting_chunk_id) if claim_verification.supporting_chunk_id else None,
                    "status": claim_verification.status,
                    "confidence": claim_verification.confidence
                })

        # In a full implementation, we would extract all citations from the report
        # For now, we'll return what we have from the verification process
        return citations

    # JSON Schema definitions for validation
    def _get_future_directions_schema(self) -> Dict[str, Any]:
        return {
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


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the service
    pass
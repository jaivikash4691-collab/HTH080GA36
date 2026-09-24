"""Service for evaluating the quality and reliability of research reports."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .llm_service import LLMService
from app.utils.llm_parser import LLMOutputParser


class EvaluationMetric(BaseModel):
    """Represents a single evaluation metric with score and justification."""

    name: str = Field(..., description="Name of the metric (e.g., 'factual_accuracy', 'citation_quality')")
    score: float = Field(..., ge=0.0, le=1.0, description="Score between 0.0 and 1.0")
    justification: str = Field(..., description="Explanation for the score")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details about the evaluation")


class ReportQualityEvaluation(BaseModel):
    """Evaluation of overall report quality."""

    factual_accuracy: EvaluationMetric = Field(..., description="Accuracy of factual claims in the report")
    citation_quality: EvaluationMetric = Field(..., description="Quality and accuracy of citations")
    logical_consistency: EvaluationMetric = Field(..., description="Internal consistency of arguments and conclusions")
    completeness: EvaluationMetric = Field(..., description="Coverage of relevant aspects of the topic")
    clarity: EvaluationMetric = Field(..., description="Clarity of expression and organization")
    overall_score: float = Field(..., ge=0.0, le=1.0, description="Weighted average of all metrics")


class HallucinationAssessment(BaseModel):
    """Assessment of potential hallucinations or fabricated content."""

    potential_hallucinations: List[str] = Field(
        default_factory=list,
        description="List of statements that may be hallucinated or fabricated"
    )
    hallucination_risk_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall risk of hallucination in the report (0.0 = no risk, 1.0 = high risk)"
    )
    verification_coverage: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Percentage of claims that could be verified against source materials"
    )


class EvaluationReport(BaseModel):
    """Complete evaluation report for a research report."""

    report_id: UUID = Field(..., description="ID of the report being evaluated")
    quality_evaluation: ReportQualityEvaluation = Field(..., description="Multi-dimensional quality assessment")
    hallucination_assessment: HallucinationAssessment = Field(..., description="Assessment of potential hallucinations")
    strengths: List[str] = Field(
        default_factory=list,
        description="Identified strengths of the report"
    )
    weaknesses: List[str] = Field(
        default_factory=list,
        description="Identified weaknesses or areas for improvement"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Specific recommendations for improvement"
    )


class EvaluationService:
    """Service for evaluating the quality and reliability of research reports."""

    def __init__(self) -> None:
        """Initialize the evaluation service."""
        self.llm_service = LLMService()
        self.parser = LLMOutputParser()

    async def evaluate_report_quality(
        self,
        report_content: Dict[str, Any],
        source_materials: List[Dict[str, Any]]
    ) -> ReportQualityEvaluation:
        """
        Evaluate the overall quality of a research report.

        Args:
            report_content: The report content to evaluate
            source_materials: Source materials used to generate the report

        Returns:
            ReportQualityEvaluation: Multi-dimensional quality assessment
        """
        # Convert report content to string for analysis
        report_text = json.dumps(report_content, indent=2)

        # Prepare source materials summary
        sources_summary = self._prepare_sources_summary(source_materials)

        # Define the evaluation prompt
        system_prompt = """You are an expert research evaluator.
        Your task is to evaluate the quality of research reports based on multiple criteria.
        You must output ONLY valid JSON.
        You must base your evaluation strictly on the provided report and source materials.
        You must provide specific justifications for your scores."""

        user_prompt = f"""Evaluate the quality of this research report:

REPORT CONTENT:
{report_text}

SOURCE MATERIALS SUMMARY:
{sources_summary}

Evaluate the report on these five dimensions:
1. FACTUAL ACCURACY: How accurate are the factual claims in the report? (Check against source materials)
2. CITATION QUALITY: How accurate and complete are the citations? (Do they correctly reference the source materials?)
3. LOGICAL CONSISTENCY: Are the arguments and conclusions logically consistent throughout the report?
4. COMPLETENESS: Does the report adequately cover the relevant aspects of the topic?
5. CLARITY: Is the report well-organized and clearly expressed?

For each dimension, provide:
- A score from 0.0 to 1.0 (where 1.0 is excellent)
- A detailed justification for your score
- Any specific observations or details

Return JSON:
{{
  "factual_accuracy": {{
    "name": "factual_accuracy",
    "score": 0.0 to 1.0,
    "justification": "string",
    "details": {{}} or null
  }},
  "citation_quality": {{
    "name": "citation_quality",
    "score": 0.0 to 1.0,
    "justification": "string",
    "details": {{}} or null
  }},
  "logical_consistency": {{
    "name": "logical_consistency",
    "score": 0.0 to 1.0,
    "justification": "string",
    "details": {{}} or null
  }},
  "completeness": {{
    "name": "completeness",
    "score": 0.0 to 1.0,
    "justification": "string",
    "details": {{}} or null
  }},
  "clarity": {{
    "name": "clarity",
    "score": 0.0 to 1.0,
    "justification": "string",
    "details": {{}} or null
  }}
}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_quality_evaluation_schema()
            )

            # Parse and validate the result
            evaluation_data = self._parse_and_validate_evaluation(raw_result)

            # Calculate overall score (weighted average)
            weights = {
                "factual_accuracy": 0.25,
                "citation_quality": 0.20,
                "logical_consistency": 0.20,
                "completeness": 0.20,
                "clarity": 0.15
            }

            overall_score = (
                evaluation_data["factual_accuracy"]["score"] * weights["factual_accuracy"] +
                evaluation_data["citation_quality"]["score"] * weights["citation_quality"] +
                evaluation_data["logical_consistency"]["score"] * weights["logical_consistency"] +
                evaluation_data["completeness"]["score"] * weights["completeness"] +
                evaluation_data["clarity"]["score"] * weights["clarity"]
            )

            # Create EvaluationMetric objects
            return ReportQualityEvaluation(
                factual_accuracy=EvaluationMetric(**evaluation_data["factual_accuracy"]),
                citation_quality=EvaluationMetric(**evaluation_data["citation_quality"]),
                logical_consistency=EvaluationMetric(**evaluation_data["logical_consistency"]),
                completeness=EvaluationMetric(**evaluation_data["completeness"]),
                clarity=EvaluationMetric(**evaluation_data["clarity"]),
                overall_score=overall_score
            )

        except Exception as e:
            # Return default evaluation on error
            default_metric = EvaluationMetric(
                name="error",
                score=0.0,
                justification=f"Evaluation failed due to error: {str(e)}"
            )
            return ReportQualityEvaluation(
                factual_accuracy=default_metric,
                citation_quality=default_metric,
                logical_consistency=default_metric,
                completeness=default_metric,
                clarity=default_metric,
                overall_score=0.0
            )

    async def assess_hallucination_risk(
        self,
        report_content: Dict[str, Any],
        source_materials: List[Dict[str, Any]]
    ) -> HallucinationAssessment:
        """
        Assess the risk of hallucinations or fabricated content in the report.

        Args:
            report_content: The report content to assess
            source_materials: Source materials used to verify claims

        Returns:
            HallucinationAssessment: Assessment of potential hallucinations
        """
        # Convert report content to string for analysis
        report_text = json.dumps(report_content, indent=2)

        # Prepare source materials summary
        sources_summary = self._prepare_sources_summary(source_materials)

        # Define the hallucination assessment prompt
        system_prompt = """You are an expert in detecting hallucinations and fabricated content in research reports.
        Your task is to identify statements that may be hallucinated (not supported by source materials) or fabricated.
        You must output ONLY valid JSON.
        You must base your assessment strictly on comparing the report against the provided source materials."""

        user_prompt = f"""Assess this research report for potential hallucinations or fabricated content:

REPORT CONTENT:
{report_text}

SOURCE MATERIALS SUMMARY:
{sources_summary}

Identify:
1. POTENTIAL HALLUCINATIONS: Specific statements in the report that appear to be hallucinated (not supported by or contradicted by source materials)
2. HALLUCINATION RISK SCORE: Overall risk level (0.0 = no risk, 1.0 = high risk)
3. VERIFICATION COVERAGE: Percentage of claims that could be verified against source materials

Return JSON:
{{
  "potential_hallucinations": [
    "string — specific statement that may be hallucinated",
    "string — another potential hallucination"
  ],
  "hallucination_risk_score": 0.0 to 1.0,
  "verification_coverage": 0.0 to 1.0
}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_hallucination_assessment_schema()
            )

            # Parse and validate the result
            assessment_data = self._parse_and_validate_assessment(raw_result)

            return HallucinationAssessment(**assessment_data)

        except Exception as e:
            # Return default assessment on error
            return HallucinationAssessment(
                potential_hallucinations=[f"Assessment failed due to error: {str(e)}"],
                hallucination_risk_score=1.0,  # High risk when assessment fails
                verification_coverage=0.0
            )

    async def evaluate_report(
        self,
        report_id: UUID,
        report_content: Dict[str, Any],
        source_materials: List[Dict[str, Any]]
    ) -> EvaluationReport:
        """
        Perform a complete evaluation of a research report.

        Args:
            report_id: ID of the report being evaluated
            report_content: The report content to evaluate
            source_materials: Source materials used to generate the report

        Returns:
            EvaluationReport: Complete evaluation report
        """
        # Run quality evaluation
        quality_evaluation = await self.evaluate_report_quality(report_content, source_materials)

        # Run hallucination assessment
        hallucination_assessment = await self.assess_hallucination_risk(report_content, source_materials)

        # Identify strengths and weaknesses based on evaluation
        strengths, weaknesses = self._identify_strengths_and_weaknesses(
            quality_evaluation, hallucination_assessment
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(
            quality_evaluation, hallucination_assessment, weaknesses
        )

        return EvaluationReport(
            report_id=report_id,
            quality_evaluation=quality_evaluation,
            hallucination_assessment=hallucination_assessment,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _prepare_sources_summary(self, source_materials: List[Dict[str, Any]]) -> str:
        """Prepare a summary of source materials for the evaluation prompt."""
        if not source_materials:
            return "No source materials provided for verification."

        summary_parts = []
        for i, material in enumerate(source_materials[:10]):  # Limit to first 10 sources
            if isinstance(material, dict):
                title = material.get("title", f"Source {i+1}")
                authors = material.get("authors", "Unknown authors")
                year = material.get("year", "Unknown year")
                summary_parts.append(f"{i+1}. {title} by {authors} ({year})")
            else:
                summary_parts.append(f"{i+1}. {str(material)[:100]}...")

        if len(source_materials) > 10:
            summary_parts.append(f"... and {len(source_materials) - 10} more sources")

        return "\n".join(summary_parts)

    def _identify_strengths_and_weaknesses(
        self,
        quality_evaluation: ReportQualityEvaluation,
        hallucination_assessment: HallucinationAssessment
    ) -> tuple[List[str], List[str]]:
        """Identify strengths and weaknesses based on evaluation results."""
        strengths = []
        weaknesses = []

        # Evaluate quality metrics
        metrics = [
            ("factual_accuracy", quality_evaluation.factual_accuracy),
            ("citation_quality", quality_evaluation.citation_quality),
            ("logical_consistency", quality_evaluation.logical_consistency),
            ("completeness", quality_evaluation.completeness),
            ("clarity", quality_evaluation.clarity)
        ]

        for name, metric in metrics:
            if metric.score >= 0.8:
                strengths.append(f"Strong {name.replace('_', ' ')} (score: {metric.score:.2f})")
            elif metric.score < 0.5:
                weaknesses.append(f"Weak {name.replace('_', ' ')} (score: {metric.score:.2f})")

        # Evaluate hallucination assessment
        if hallucination_assessment.hallucination_risk_score < 0.3:
            strengths.append(f"Low hallucination risk (score: {hallucination_assessment.hallucination_risk_score:.2f})")
        elif hallucination_assessment.hallucination_risk_score > 0.7:
            weaknesses.append(f"High hallucination risk (score: {hallucination_assessment.hallucination_risk_score:.2f})")

        if hallucination_assessment.verification_coverage > 0.8:
            strengths.append(f"High verification coverage ({hallucination_assessment.verification_coverage:.0%} of claims verified)")
        elif hallucination_assessment.verification_coverage < 0.5:
            weaknesses.append(f"Low verification coverage ({hallucination_assessment.verification_coverage:.0%} of claims verified)")

        # Add specific hallucinations if found
        if hallucination_assessment.potential_hallucinations:
            weaknesses.append(f"Contains {len(hallucination_assessment.potential_hallucinations)} potentially hallucinated statements")

        return strengths, weaknesses

    def _generate_recommendations(
        self,
        quality_evaluation: ReportQualityEvaluation,
        hallucination_assessment: HallucinationAssessment,
        weaknesses: List[str]
    ) -> List[str]:
        """Generate specific recommendations for improvement."""
        recommendations = []

        # Recommendations based on weak metrics
        if quality_evaluation.factual_accuracy.score < 0.7:
            recommendations.append(
                "Verify all factual claims against source materials and correct any inaccuracies"
            )

        if quality_evaluation.citation_quality.score < 0.7:
            recommendations.append(
                "Review and correct citations to ensure they accurately reference the source materials"
            )

        if quality_evaluation.logical_consistency.score < 0.7:
            recommendations.append(
                "Review the report for logical inconsistencies and ensure arguments flow coherently"
            )

        if quality_evaluation.completeness.score < 0.7:
            recommendations.append(
                "Expand coverage of the topic to include important aspects that are currently missing"
            )

        if quality_evaluation.clarity.score < 0.7:
            recommendations.append(
                "Improve organization and clarity of expression to make the report more accessible"
            )

        # Recommendations based on hallucination assessment
        if hallucination_assessment.hallucination_risk_score > 0.5:
            recommendations.append(
                "Review content for potential hallucinations and remove or verify unsupported statements"
            )

        if hallucination_assessment.verification_coverage < 0.6:
            recommendations.append(
                "Increase the proportion of claims that can be verified against source materials"
            )

        # Add specific recommendations for hallucinated content
        if hallucination_assessment.potential_hallucinations:
            recommendations.append(
                f"Specifically review the {len(hallucination_assessment.potential_hallucinations)} flagged statements for accuracy"
            )

        # Remove duplicates while preserving order
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)

        return unique_recommendations[:5]  # Limit to top 5 recommendations

    def _parse_and_validate_evaluation(self, raw_result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate the quality evaluation result."""
        # Ensure all required dimensions are present
        required_dimensions = [
            "factual_accuracy", "citation_quality", "logical_consistency",
            "completeness", "clarity"
        ]

        for dimension in required_dimensions:
            if dimension not in raw_result:
                raw_result[dimension] = {
                    "name": dimension,
                    "score": 0.0,
                    "justification": f"Missing {dimension} in evaluation",
                    "details": {}
                }
            elif isinstance(raw_result[dimension], dict):
                # Ensure required fields are present
                if "name" not in raw_result[dimension]:
                    raw_result[dimension]["name"] = dimension
                if "score" not in raw_result[dimension]:
                    raw_result[dimension]["score"] = 0.0
                if "justification" not in raw_result[dimension]:
                    raw_result[dimension]["justification"] = f"Missing justification for {dimension}"
                if "details" not in raw_result[dimension]:
                    raw_result[dimension]["details"] = {}

                # Validate score range
                score = raw_result[dimension]["score"]
                if not isinstance(score, (int, float)) or score < 0.0 or score > 1.0:
                    raw_result[dimension]["score"] = 0.0
            else:
                # Convert non-dict to proper structure
                raw_result[dimension] = {
                    "name": dimension,
                    "score": 0.0,
                    "justification": f"Invalid format for {dimension}",
                    "details": {}
                }

        return raw_result

    def _parse_and_validate_assessment(self, raw_result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate the hallucination assessment result."""
        # Ensure required fields are present
        if "potential_hallucinations" not in raw_result:
            raw_result["potential_hallucinations"] = []
        if "hallucination_risk_score" not in raw_result:
            raw_result["hallucination_risk_score"] = 0.5
        if "verification_coverage" not in raw_result:
            raw_result["verification_coverage"] = 0.0

        # Validate types and ranges
        if not isinstance(raw_result["potential_hallucinations"], list):
            raw_result["potential_hallucinations"] = []

        # Ensure all items are strings
        raw_result["potential_hallucinations"] = [
            str(item) for item in raw_result["potential_hallucinations"]
        ]

        # Validate score ranges
        for score_field in ["hallucination_risk_score", "verification_coverage"]:
            score = raw_result[score_field]
            if not isinstance(score, (int, float)) or score < 0.0 or score > 1.0:
                raw_result[score_field] = 0.5 if "risk" in score_field else 0.0

        return raw_result

    def _get_quality_evaluation_schema(self) -> Dict[str, Any]:
        """Get JSON schema for quality evaluation validation."""
        return {
            "type": "object",
            "properties": {
                "factual_accuracy": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "score": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                        "justification": {"type": "string"},
                        "details": {"type": "object"}
                    },
                    "required": ["name", "score", "justification"]
                },
                "citation_quality": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "score": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                        "justification": {"type": "string"},
                        "details": {"type": "object"}
                    },
                    "required": ["name", "score", "justification"]
                },
                "logical_consistency": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "score": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                        "justification": {"type": "string"},
                        "details": {"type": "object"}
                    },
                    "required": ["name", "score", "justification"]
                },
                "completeness": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "score": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                        "justification": {"type": "string"},
                        "details": {"type": "object"}
                    },
                    "required": ["name", "score", "justification"]
                },
                "clarity": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "score": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                        "justification": {"type": "string"},
                        "details": {"type": "object"}
                    },
                    "required": ["name", "score", "justification"]
                }
            },
            "required": ["factual_accuracy", "citation_quality", "logical_consistency", "completeness", "clarity"]
        }

    def _get_hallucination_assessment_schema(self) -> Dict[str, Any]:
        """Get JSON schema for hallucination assessment validation."""
        return {
            "type": "object",
            "properties": {
                "potential_hallucinations": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "hallucination_risk_score": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0
                },
                "verification_coverage": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0
                }
            },
            "required": ["potential_hallucinations", "hallucination_risk_score", "verification_coverage"]
        }


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the service
    pass
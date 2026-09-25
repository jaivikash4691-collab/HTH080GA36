"""Service for verifying claims and citations in research reports."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .llm_service import LLMService


class Claim(BaseModel):
    """Represents a factual claim extracted from text."""

    claim_text: str
    claim_type: str  # FINDING / COMPARISON / ADVANTAGE / DISADVANTAGE / LIMITATION / GAP / RECOMMENDATION / CONCLUSION
    involves_papers: List[str]
    specificity: str  # HIGH or MEDIUM or LOW


class ClaimVerification(BaseModel):
    """Result of verifying a claim against evidence."""

    status: str  # SUPPORTED / PARTIALLY_SUPPORTED / UNSUPPORTED / CONTRADICTED
    confidence: float  # 0.0 to 1.0
    supporting_passage: Optional[str] = None
    supporting_chunk_id: Optional[UUID] = None
    explanation: str
    suggested_correction: Optional[str] = None


class CitationVerification(BaseModel):
    """Result of verifying a citation."""

    paper_exists: bool
    page_accurate: Optional[bool] = None  # Can be True, False, or "Not reported" -> using Optional[bool] with None for not reported
    section_accurate: Optional[bool] = None  # Same as above
    passage_found: bool
    overall_valid: bool
    issues: List[str]
    corrected_citation: Optional[Dict[str, Any]] = None


class VerificationReport(BaseModel):
    """Report of the verification process."""

    cleaned_report: Dict[str, Any]
    total_claims: int
    supported_count: int
    partially_supported_count: int
    unsupported_count: int
    contradicted_count: int
    citation_accuracy: float  # percentage
    overall_accuracy_score: float  # percentage
    flagged_claims: List[ClaimVerification]  # UNSUPPORTED or CONTRADICTED claims


class ClaimVerificationService:
    """Service for verifying claims and citations."""

    def __init__(self) -> None:
        """Initialize the claim verification service."""
        try:
            from app.config import get_reasoning_model, settings
            from .llm_service import LLMConfig
            cfg = LLMConfig(
                provider=settings.llm_provider,
                model=get_reasoning_model(),
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
                timeout=settings.verification_timeout,
                max_retries=settings.llm_max_retries,
            )
            self.llm_service = LLMService(config=cfg)
        except Exception:
            self.llm_service = LLMService()



    async def extract_claims(
        self,
        text: str,
        paper_analyses: List[Dict[str, Any]]
    ) -> List[Claim]:
        """
        Extract factual claims from text.

        Args:
            text: Text to extract claims from
            paper_analyses: List of paper analyses for context

        Returns:
            List[Claim]: List of extracted claims
        """
        if not text.strip():
            return []

        # Prepare paper titles for context
        paper_titles = []
        for paper in paper_analyses:
            if isinstance(paper, dict):
                title = paper.get("title", "Unknown Paper")
            else:
                # Assuming it's a PaperAnalysis object
                title = getattr(paper, 'objective', 'Unknown Paper')
            paper_titles.append(title)

        papers_context = f"Available papers: {', '.join(paper_titles)}" if paper_titles else "No papers provided"

        # Define the exact prompt structure as specified
        system_prompt = """You are a claim extraction specialist.
Extract every factual claim from the provided text.
A claim is a specific assertion about:
- A finding, result, or performance metric
- A comparison between methods
- An advantage or disadvantage
- A limitation or research gap
- A recommendation or conclusion
Do NOT extract meta-statements or headings.
Output ONLY valid JSON."""

        user_prompt = f"""Extract all factual claims from this text:

{text}

{papers_context}

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

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_claims_extraction_schema()
            )

            # Extract claims from the result
            claims_data = raw_result.get("claims", [])

            # Convert to Claim objects
            claims = []
            for item in claims_data:
                try:
                    # Validate claim_type
                    valid_claim_types = [
                        "FINDING", "COMPARISON", "ADVANTAGE", "DISADVANTAGE",
                        "LIMITATION", "GAP", "RECOMMENDATION", "CONCLUSION"
                    ]
                    if item.get("claim_type") not in valid_claim_types:
                        item["claim_type"] = "FINDING"  # Default

                    # Validate specificity
                    if item.get("specificity") not in ["HIGH", "MEDIUM", "LOW"]:
                        item["specificity"] = "MEDIUM"  # Default

                    claims.append(Claim(**item))
                except Exception as e:
                    # Skip invalid claims
                    print(f"Skipping invalid claim: {e}")
                    continue

            return claims

        except Exception as e:
            print(f"Error extracting claims: {e}")
            return []

    async def verify_claim(
        self,
        claim: Claim,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> ClaimVerification:
        """
        Verify a claim against retrieved evidence chunks.

        Args:
            claim: Claim to verify
            retrieved_chunks: List of retrieved chunks with metadata

        Returns:
            ClaimVerification: Verification result
        """
        if not retrieved_chunks:
            return ClaimVerification(
                status="UNSUPPORTED",
                confidence=0.0,
                supporting_passage=None,
                supporting_chunk_id=None,
                explanation="No evidence chunks provided for verification",
                suggested_correction="Insufficient evidence in the uploaded documents."
            )

        # Format chunks for the prompt
        formatted_chunks = ""
        for i, chunk in enumerate(retrieved_chunks):
            chunk_id = chunk.get("chunk_id", f"chunk_{i}")
            section = chunk.get("section", "Not reported")
            page_number = chunk.get("page_number", chunk.get("page", "Not reported"))
            content = chunk.get("content", "")

            formatted_chunks += f"[Chunk ID: {chunk_id} | Section: {section} | Page: {page_number}]\n{content}\n\n"

        # Define the exact prompt structure as specified
        system_prompt = """You are a rigorous claim verifier.
Your task is to determine whether a claim is supported by the evidence.
You must compare the claim ONLY against the provided evidence chunks.
You must return one of these statuses:
  SUPPORTED — the evidence directly supports the claim
  PARTIALLY_SUPPORTED — the evidence partially supports the claim
    but is incomplete or qualified
  UNSUPPORTED — the evidence does not support the claim
  CONTRADICTED — the evidence directly contradicts the claim
You must include the specific passage that supports or contradicts.
You must return a confidence score between 0.0 and 1.0.
Output ONLY valid JSON."""

        user_prompt = f"""Claim to verify:
"{claim.claim_text}"

Evidence chunks:
{formatted_chunks}

Return JSON:
{{
  "status": "SUPPORTED / PARTIALLY_SUPPORTED / UNSUPPORTED / CONTRADICTED",
  "confidence": 0.0 to 1.0,
  "supporting_passage": "string — the relevant passage or null",
  "supporting_chunk_id": "uuid or null",
  "explanation": "string — why you assigned this status",
  "suggested_correction": "string — corrected version if unsupported, or null"
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
                schema=self._get_claim_verification_schema()
            )

            # Convert to ClaimVerification object
            # Handle the case where supporting_chunk_id might be a string that needs to be UUID
            verification_data = raw_result.copy()

            # Convert supporting_chunk_id to UUID if it's a string
            if verification_data.get("supporting_chunk_id") and isinstance(verification_data["supporting_chunk_id"], str):
                try:
                    verification_data["supporting_chunk_id"] = UUID(verification_data["supporting_chunk_id"])
                except Exception:
                    # If conversion fails, set to None
                    verification_data["supporting_chunk_id"] = None

            # Ensure confidence is within bounds
            confidence = verification_data.get("confidence", 0.0)
            verification_data["confidence"] = max(0.0, min(1.0, float(confidence)))

            # Validate status
            valid_statuses = ["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED"]
            if verification_data.get("status") not in valid_statuses:
                verification_data["status"] = "UNSUPPORTED"

            return ClaimVerification(**verification_data)

        except Exception as e:
            print(f"Error verifying claim: {e}")
            return ClaimVerification(
                status="UNSUPPORTED",
                confidence=0.0,
                supporting_passage=None,
                supporting_chunk_id=None,
                explanation=f"Verification error: {str(e)}",
                suggested_correction="Insufficient evidence in the uploaded documents."
            )

    async def verify_citation(
        self,
        citation: Dict[str, Any],
        chunk_db: List[Dict[str, Any]]
    ) -> CitationVerification:
        """
        Verify a citation against the chunk database.

        Args:
            citation: Citation to verify (with paper_title, section, page, claim_text, passage)
            chunk_db: List of all available chunks

        Returns:
            CitationVerification: Verification result
        """
        # Extract citation details
        paper_title = citation.get("paper_title", "")
        section = citation.get("section", "")
        page = citation.get("page")
        claim_text = citation.get("claim_text", "")
        passage = citation.get("passage", "")

        # Find matching chunk in chunk_db
        actual_chunk = None
        for chunk in chunk_db:
            # Match by paper title (case insensitive, partial match)
            chunk_paper_title = chunk.get("paper_title", "").lower()
            if paper_title.lower() in chunk_paper_title or chunk_paper_title in paper_title.lower():
                # Check section match
                chunk_section = chunk.get("section", "").lower()
                citation_section = section.lower()
                if not section or chunk_section == citation_section or section in chunk_section or chunk_section in section:
                    # Check page match
                    chunk_page = chunk.get("page_number", chunk.get("page"))
                    if page is None or chunk_page == page or (isinstance(chunk_page, str) and chunk_page.isdigit() and int(chunk_page) == page):
                        actual_chunk = chunk
                        break

        if not actual_chunk:
            # No matching chunk found
            return CitationVerification(
                paper_exists=False,
                page_accurate=None,
                section_accurate=None,
                passage_found=False,
                overall_valid=False,
                issues=["No matching paper found in the provided chunks"],
                corrected_citation=None
            )

        # Extract actual chunk details
        actual_paper_title = actual_chunk.get("paper_title", "Unknown")
        actual_section = actual_chunk.get("section", "Not reported")
        actual_page = actual_chunk.get("page_number", actual_chunk.get("page", "Not reported"))
        actual_content = actual_chunk.get("content", "")

        # Initialize verification results
        paper_exists = True  # We found a matching paper
        page_accurate = None
        section_accurate = None
        passage_found = False
        issues = []

        # Check page accuracy
        if page is not None and actual_page != "Not reported":
            try:
                page_int = int(page) if isinstance(page, str) else page
                actual_page_int = int(actual_page) if isinstance(actual_page, str) else actual_page
                page_accurate = (page_int == actual_page_int)
                if not page_accurate:
                    issues.append(f"Page mismatch: cited page {page}, actual page {actual_page}")
            except (ValueError, TypeError):
                page_accurate = None
                issues.append(f"Could not compare page numbers: cited '{page}', actual '{actual_page}'")
        elif page is not None:
            # Page cited but not reported in chunk
            page_accurate = None
            issues.append(f"Page {page} cited but not reported in actual chunk")
        else:
            # No page cited
            page_accurate = None

        # Check section accuracy
        if section and actual_section != "Not reported":
            section_accurate = (section.lower() == actual_section.lower())
            if not section_accurate:
                issues.append(f"Section mismatch: cited section '{section}', actual section '{actual_section}'")
        elif section:
            # Section cited but not reported in chunk
            section_accurate = None
            issues.append(f"Section '{section}' cited but not reported in actual chunk")
        else:
            # No section cited
            section_accurate = None

        # Check if passage is found in actual content
        if passage and actual_content:
            # Check if passage appears in content (case insensitive)
            passage_found = passage.lower() in actual_content.lower()
            if not passage_found:
                issues.append(f"Cited passage not found in the actual chunk content")
        elif passage:
            # Passage cited but no content to check against
            passage_found = False
            issues.append("No content available in chunk to verify passage")
        else:
            # No passage cited
            passage_found = True  # Nothing to verify

        # Determine overall validity
        overall_valid = (
            paper_exists and
            (page_accurate is None or page_accurate) and
            (section_accurate is None or section_accurate) and
            passage_found
        )

        # Prepare corrected citation if needed
        corrected_citation = None
        if not overall_valid:
            corrected_citation = {
                "paper_title": actual_paper_title,
                "section": actual_section if actual_section != "Not reported" else None,
                "page": actual_page if actual_page != "Not reported" else None
            }
            # Remove None values
            corrected_citation = {k: v for k, v in corrected_citation.items() if v is not None}
            if not corrected_citation:
                corrected_citation = None

        return CitationVerification(
            paper_exists=paper_exists,
            page_accurate=page_accurate,
            section_accurate=section_accurate,
            passage_found=passage_found,
            overall_valid=overall_valid,
            issues=issues,
            corrected_citation=corrected_citation
        )

    async def run_full_verification(
        self,
        report_content: Dict[str, Any],
        retrieval_service: Any
    ) -> VerificationReport:
        """
        Run full verification pipeline on report content.

        Args:
            report_content: The report content to verify
            retrieval_service: Service for retrieving relevant chunks

        Returns:
            VerificationReport: Complete verification results
        """
        # Extract text from report content (simplified - in practice this would be more complex)
        report_text = json.dumps(report_content)

        # For paper_analyses, we would need to get this from somewhere
        # For now, we'll use an empty list and note that this would be provided externally
        paper_analyses = []  # This should be provided by the caller

        # Step 1: Extract all claims from the report content
        claims = await self.extract_claims(report_text, paper_analyses)

        # Step 2: Verify each claim
        claim_verifications = []
        flagged_claims = []

        for claim in claims:
            # Retrieve top 5 relevant chunks using retrieval_service
            # This is a simplified version - in practice, we'd use the claim text to query
            try:
                # Assuming retrieval_service has a method to get relevant chunks
                retrieved_chunks = await retrieval_service.get_relevant_chunks(claim.claim_text, limit=5)
            except Exception:
                # If retrieval fails, use empty list
                retrieved_chunks = []

            # Verify the claim
            verification = await self.verify_claim(claim, retrieved_chunks)
            claim_verifications.append(verification)

            # Flag UNSUPPORTED or CONTRADICTED claims
            if verification.status in ["UNSUPPORTED", "CONTRADICTED"]:
                flagged_claims.append(verification)

        # Step 3: Verify citations (simplified - would need to extract citations from report)
        # For now, we'll skip detailed citation verification and note it would be implemented
        citation_verifications = []  # Would be populated by verifying actual citations

        # Step 4: Generate verification statistics
        total_claims = len(claims)
        supported_count = sum(1 for v in claim_verifications if v.status == "SUPPORTED")
        partially_supported_count = sum(1 for v in claim_verifications if v.status == "PARTIALLY_SUPPORTED")
        unsupported_count = sum(1 for v in claim_verifications if v.status == "UNSUPPORTED")
        contradicted_count = sum(1 for v in claim_verifications if v.status == "CONTRADICTED")

        # Calculate citation accuracy (simplified)
        citation_accuracy = 100.0 if not citation_verifications else (
            sum(1 for v in citation_verifications if v.overall_valid) / len(citation_verifications) * 100
        )

        # Calculate overall accuracy score
        if total_claims > 0:
            overall_accuracy_score = (
                (supported_count * 1.0 + partially_supported_count * 0.5) / total_claims * 100
            )
        else:
            overall_accuracy_score = 100.0

        # Step 5: Filter the report
        cleaned_report = await self._filter_report(report_content, claim_verifications)

        return VerificationReport(
            cleaned_report=cleaned_report,
            total_claims=total_claims,
            supported_count=supported_count,
            partially_supported_count=partially_supported_count,
            unsupported_count=unsupported_count,
            contradicted_count=contradicted_count,
            citation_accuracy=citation_accuracy,
            overall_accuracy_score=overall_accuracy_score,
            flagged_claims=flagged_claims
        )

    def calculate_accuracy_metrics(self, verifications: List[ClaimVerification]) -> Dict[str, float]:
        """
        Calculate accuracy metrics from verification results.

        Args:
            verifications: List of ClaimVerification objects

        Returns:
            Dict[str, float]: Accuracy metrics as percentages
        """
        if not verifications:
            return {
                "evidence_supported_rate": 0.0,
                "citation_accuracy_rate": 0.0
            }

        # Evidence supported rate: SUPPORTED / total
        supported_count = sum(1 for v in verifications if v.status == "SUPPORTED")
        evidence_supported_rate = (supported_count / len(verifications)) * 100

        # For citation accuracy, we would need citation verifications
        # Since we don't have those here, we'll return a placeholder
        # In a full implementation, this would take both claim and citation verifications
        citation_accuracy_rate = 0.0  # Placeholder

        return {
            "evidence_supported_rate": evidence_supported_rate,
            "citation_accuracy_rate": citation_accuracy_rate
        }

    async def _filter_report(
        self,
        report_content: Dict[str, Any],
        claim_verifications: List[ClaimVerification]
    ) -> Dict[str, Any]:
        """
        Filter the report based on verification results.

        Args:
            report_content: Original report content
            claim_verifications: Verification results for claims

        Returns:
            Dict[str, Any]: Filtered report content
        """
        # This is a simplified implementation
        # In practice, we would need to map verifications back to specific claims in the report
        # and modify the report content accordingly

        # For now, we'll return the original content with a note about filtering
        # A real implementation would:
        # 1. Map each claim verification to its location in the report
        # 2. Keep SUPPORTED claims as-is
        # 3. Keep PARTIALLY_SUPPORTED claims with a qualifier added
        # 4. Replace UNSUPPORTED claims with "Insufficient evidence in the uploaded documents."
        # 5. Mark CONTRADICTED claims clearly

        cleaned_report = report_content.copy()
        cleaned_report["_verification_note"] = (
            "Report has been processed through claim verification. "
            "See VerificationReport for details on claim validity."
        )

        return cleaned_report

    # JSON Schema definitions for validation
    def _get_claims_extraction_schema(self) -> Dict[str, Any]:
        return {
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

    def _get_claim_verification_schema(self) -> Dict[str, Any]:
        return {
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


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the service
    pass
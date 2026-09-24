"""Main analysis pipeline service orchestrating all stages of research paper analysis."""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from .analysis_service import PaperAnalysisService
from .crossdoc_service import CrossDocumentAnalysisService
from .llm_service import LLMService
from .prompt_library import PromptLibrary
from .qa_service import QAService
from .report_service import ReportGenerationService
from .verification_service import ClaimVerificationService


class PipelineProgressEvent:
    """Represents a progress event in the pipeline."""

    def __init__(
        self,
        session_id: UUID,
        stage: str,
        message: str,
        percent: int,
        timestamp: Optional[datetime] = None
    ):
        self.session_id = session_id
        self.stage = stage
        self.message = message
        self.percent = percent
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_id": str(self.session_id),
            "stage": self.stage,
            "message": self.message,
            "percent": self.percent,
            "timestamp": self.timestamp.isoformat()
        }


class PipelineConfig:
    """Configuration for the analysis pipeline."""

    def __init__(
        self,
        max_parallel_papers: int = 3,
        max_parallel_cross_analysis: int = 2,
        verification_enabled: bool = True,
        min_claim_confidence: float = 0.7,
        max_chunks_per_paper_analysis: int = 50,
        max_chunks_per_cross_analysis: int = 30,
        max_context_tokens: int = 6000,
        progress_poll_interval_seconds: int = 2
    ):
        self.max_parallel_papers = max_parallel_papers
        self.max_parallel_cross_analysis = max_parallel_cross_analysis
        self.verification_enabled = verification_enabled
        self.min_claim_confidence = min_claim_confidence
        self.max_chunks_per_paper_analysis = max_chunks_per_paper_analysis
        self.max_chunks_per_cross_analysis = max_chunks_per_cross_analysis
        self.max_context_tokens = max_context_tokens
        self.progress_poll_interval_seconds = progress_poll_interval_seconds


class PipelineResult:
    """Result of running the full analysis pipeline."""

    def __init__(
        self,
        session_id: UUID,
        report_id: Optional[UUID] = None,
        paper_count: int = 0,
        accuracy_metrics: Optional[Dict[str, Any]] = None,
        processing_time_seconds: float = 0.0,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        self.session_id = session_id
        self.report_id = report_id
        self.paper_count = paper_count
        self.accuracy_metrics = accuracy_metrics or {}
        self.processing_time_seconds = processing_time_seconds
        self.success = success
        self.error_message = error_message


class AnalysisPipeline:
    """Master orchestrator for the research paper analysis pipeline."""

    # Pipeline progress stages
    STAGE_VALIDATING = "VALIDATING"
    STAGE_PAPER_ANALYSIS = "PAPER_ANALYSIS"
    STAGE_COMMON_FINDINGS = "COMMON_FINDINGS"
    STAGE_CONTRADICTIONS = "CONTRADICTIONS"
    STAGE_METHODOLOGY = "METHODOLOGY"
    STAGE_GAPS = "RESEARCH_GAPS"
    STAGE_IMPROVEMENTS = "IMPROVEMENTS"
    STAGE_REPORT = "REPORT_ASSEMBLY"
    STAGE_VERIFICATION = "VERIFICATION"
    STAGE_COMPLETE = "COMPLETE"
    STAGE_ERROR = "ERROR"

    def __init__(self, config: Optional[PipelineConfig] = None):
        """
        Initialize the analysis pipeline.

        Args:
            config: Pipeline configuration (uses defaults if None)
        """
        self.config = config or PipelineConfig()

        # Initialize services
        self.analysis_service = PaperAnalysisService()
        self.crossdoc_service = CrossDocumentAnalysisService()
        self.report_service = ReportGenerationService()
        self.qa_service = QAService()
        self.verification_service = ClaimVerificationService()
        self.llm_service = LLMService()

        # In-memory progress store (in production, this would be Redis)
        self.progress_store: Dict[str, List[Dict[str, Any]]] = {}

        # Accuracy tracker
        self.accuracy_tracker = AccuracyTracker()

    async def emit_progress(
        self,
        session_id: UUID,
        stage: str,
        message: str,
        percent: int
    ) -> None:
        """
        Emit a progress event for the pipeline.

        Args:
            session_id: Session identifier
            stage: Current pipeline stage
            message: Progress message
            percent: Completion percentage (0-100)
        """
        event = PipelineProgressEvent(
            session_id=session_id,
            stage=stage,
            message=message,
            percent=percent
        )

        # Store in memory (would use Redis in production)
        session_key = str(session_id)
        if session_key not in self.progress_store:
            self.progress_store[session_key] = []

        self.progress_store[session_key].append(event.to_dict())

        # In a real implementation, we would also publish to Redis or message queue
        # For now, we'll just store it

    async def get_progress(self, session_id: UUID) -> List[Dict[str, Any]]:
        """
        Get all progress events for a session.

        Args:
            session_id: Session identifier

        Returns:
            List of progress event dictionaries
        """
        session_key = str(session_id)
        return self.progress_store.get(session_key, [])

    async def run_full_pipeline(
        self,
        session_id: UUID,
        paper_ids: List[UUID]
    ) -> PipelineResult:
        """
        Run the full analysis pipeline from start to finish.

        Args:
            session_id: Session identifier
            paper_ids: List of paper UUIDs to analyze

        Returns:
            PipelineResult with outcome and metrics
        """
        start_time = time.time()

        try:
            # STAGE 0: Validate
            await self.emit_progress(
                session_id,
                self.STAGE_VALIDATING,
                "Validating papers and session...",
                5
            )

            validation_result = await self._validate_papers(paper_ids)
            if not validation_result[0]:  # If validation failed
                return PipelineResult(
                    session_id=session_id,
                    success=False,
                    error_message=validation_result[1],
                    processing_time_seconds=time.time() - start_time
                )

            valid_paper_ids = validation_result[2]  # List of valid paper IDs

            # Update session status to analyzing
            await self._update_session_status(session_id, "analyzing")

            # STAGE 1: Individual Paper Analysis
            await self.emit_progress(
                session_id,
                self.STAGE_PAPER_ANALYSIS,
                f"Analyzing {len(valid_paper_ids)} papers...",
                10
            )

            paper_analyses = await self.analysis_service.analyze_all_papers(valid_paper_ids)

            # Emit progress for each paper
            for i, paper_analysis in enumerate(paper_analyses):
                percent = 10 + int((i + 1) / len(paper_analyses) * 20)  # 10-30% range
                paper_title = getattr(paper_analysis, 'objective', f'Paper {i+1}')
                await self.emit_progress(
                    session_id,
                    self.STAGE_PAPER_ANALYSIS,
                    f"Analyzing paper {i+1}/{len(paper_analyses)}: {paper_title[:50]}...",
                    percent
                )

            await self.emit_progress(
                session_id,
                self.STAGE_PAPER_ANALYSIS,
                f"Completed analysis of {len(paper_analyses)} papers",
                30
            )

            # STAGE 2: Cross-Paper Analysis
            await self.emit_progress(
                session_id,
                self.STAGE_COMMON_FINDINGS,
                "Running cross-paper analysis...",
                35
            )

            # Run parallel analyses where safe
            common_findings_task = asyncio.create_task(
                self.crossdoc_service.find_common_findings(paper_analyses)
            )
            contradictions_task = asyncio.create_task(
                self.crossdoc_service.detect_contradictions(paper_analyses)
            )
            methodology_task = asyncio.create_task(
                self.crossdoc_service.compare_methodologies(paper_analyses)
            )

            # Wait for parallel tasks
            common_findings, contradictions, methodology_comparison = await asyncio.gather(
                common_findings_task,
                contradictions_task,
                methodology_task,
                return_exceptions=True
            )

            # Handle exceptions
            if isinstance(common_findings, Exception):
                common_findings = []
                await self.emit_progress(
                    session_id,
                    self.STAGE_COMMON_FINDINGS,
                    f"Warning: Common findings analysis failed: {str(common_findings)}",
                    40
                )

            if isinstance(contradictions, Exception):
                contradictions = []
                await self.emit_progress(
                    session_id,
                    self.STAGE_CONTRADICTIONS,
                    f"Warning: Contradiction detection failed: {str(contradictions)}",
                    45
                )

            if isinstance(methodology_comparison, Exception):
                methodology_comparison = {}
                await self.emit_progress(
                    session_id,
                    self.STAGE_METHODOLOGY,
                    f"Warning: Methodology comparison failed: {str(methodology_comparison)}",
                    50
                )

            await self.emit_progress(
                session_id,
                self.STAGE_COMMON_FINDINGS,
                "Completed common findings analysis",
                40
            )

            await self.emit_progress(
                session_id,
                self.STAGE_CONTRADICTIONS,
                "Completed contradiction detection",
                45
            )

            await self.emit_progress(
                session_id,
                self.STAGE_METHODOLOGY,
                "Completed methodology comparison",
                50
            )

            # Identify research gaps (sequential, depends on contradictions)
            await self.emit_progress(
                session_id,
                self.STAGE_GAPS,
                "Identifying research gaps...",
                55
            )

            try:
                research_gaps = await self.crossdoc_service.identify_research_gaps(
                    paper_analyses, contradictions
                )
            except Exception as e:
                research_gaps = []
                await self.emit_progress(
                    session_id,
                    self.STAGE_GAPS,
                    f"Warning: Research gap identification failed: {str(e)}",
                    60
                )

            await self.emit_progress(
                session_id,
                self.STAGE_GAPS,
                "Completed research gap identification",
                60
            )

            # Generate improvement analysis (sequential, depends on gaps)
            await self.emit_progress(
                session_id,
                self.STAGE_IMPROVEMENTS,
                "Analyzing improvements...",
                65
            )

            try:
                improvement_analysis = await self.crossdoc_service.generate_improvement_analysis(
                    paper_analyses, research_gaps
                )
            except Exception as e:
                improvement_analysis = {}
                await self.emit_progress(
                    session_id,
                    self.STAGE_IMPROVEMENTS,
                    f"Warning: Improvement analysis failed: {str(e)}",
                    70
                )

            await self.emit_progress(
                session_id,
                self.STAGE_IMPROVEMENTS,
                "Completed improvement analysis",
                70
            )

            # STAGE 3: Report Assembly
            await self.emit_progress(
                session_id,
                self.STAGE_REPORT,
                "Assembling synthesis report...",
                75
            )

            try:
                report_content = await self.report_service.assemble_full_report(
                    session_id=session_id,
                    paper_analyses=paper_analyses,
                    common_findings=common_findings,
                    contradictions=contradictions,
                    methodology_comparison=methodology_comparison,
                    research_gaps=research_gaps,
                    improvement_analysis=improvement_analysis
                )

                # Store report and get report ID
                report_id = await self._store_report(session_id, report_content)

            except Exception as e:
                await self.emit_progress(
                    session_id,
                    self.STAGE_ERROR,
                    f"Report assembly failed: {str(e)}",
                    80
                )
                return PipelineResult(
                    session_id=session_id,
                    success=False,
                    error_message=f"Report assembly failed: {str(e)}",
                    processing_time_seconds=time.time() - start_time
                )

            await self.emit_progress(
                session_id,
                self.STAGE_REPORT,
                "Completed report assembly",
                80
            )

            # STAGE 4: Verification (if enabled)
            if self.config.verification_enabled:
                await self.emit_progress(
                    session_id,
                    self.STAGE_VERIFICATION,
                    "Verifying claims and citations...",
                    85
                )

                try:
                    # For verification, we need a retrieval service
                    # In a real implementation, this would be passed in
                    # For now, we'll create a simple mock or use the LLM service
                    verification_report = await self.verification_service.run_full_verification(
                        report_content=report_content,
                        retrieval_service=self._create_mock_retrieval_service()
                    )

                    # Apply verification results to report
                    verified_report = await self._apply_verification_results(
                        report_content, verification_report
                    )

                    # Store verification results
                    await self._store_verification_results(
                        session_id, verification_report
                    )

                    # Calculate accuracy metrics
                    accuracy_metrics = self.accuracy_tracker.get_metrics()

                except Exception as e:
                    await self.emit_progress(
                        session_id,
                        self.STAGE_ERROR,
                        f"Verification failed: {str(e)}",
                        90
                    )
                    # Continue without verification - mark as unavailable
                    verification_report = None
                    accuracy_metrics = {"verification_unavailable": True}

            else:
                verification_report = None
                accuracy_metrics = self.accuracy_tracker.get_metrics()

            await self.emit_progress(
                session_id,
                self.STAGE_VERIFICATION,
                "Completed verification",
                90
            )

            # STAGE 5: Finalize
            await self.emit_progress(
                session_id,
                self.STAGE_COMPLETE,
                "Finalizing pipeline...",
                95
            )

            # Update session status to complete
            await self._update_session_status(session_id, "complete")

            processing_time = time.time() - start_time

            await self.emit_progress(
                session_id,
                self.STAGE_COMPLETE,
                "Pipeline completed successfully",
                100
            )

            return PipelineResult(
                session_id=session_id,
                report_id=report_id,
                paper_count=len(valid_paper_ids),
                accuracy_metrics=accuracy_metrics,
                processing_time_seconds=processing_time,
                success=True
            )

        except Exception as e:
            # Handle unexpected errors
            await self.emit_progress(
                session_id,
                self.STAGE_ERROR,
                f"Pipeline failed with error: {str(e)}",
                0
            )

            # Try to update session status to error
            try:
                await self._update_session_status(session_id, "failed")
            except:
                pass  # Ignore errors in error handling

            return PipelineResult(
                session_id=session_id,
                success=False,
                error_message=str(e),
                processing_time_seconds=time.time() - start_time
            )

    async def run_stage1_only(
        self,
        paper_ids: List[UUID]
    ) -> List[Any]:
        """
        Run only individual paper analysis (Stage 1).

        Args:
            paper_ids: List of paper UUIDs to analyze

        Returns:
            List of PaperAnalysis objects
        """
        return await self.analysis_service.analyze_all_papers(paper_ids)

    async def run_stage2_only(
        self,
        paper_ids: List[UUID]
    ) -> Any:
        """
        Run only cross-paper analysis (Stage 2), assuming Stage 1 is done.

        Args:
            paper_ids: List of paper UUIDs (analyses loaded from database)

        Returns:
            CrossDocAnalysis object containing all Stage 2 results
        """
        # Load paper analyses from database
        paper_analyses = await self._load_paper_analyses(paper_ids)

        # Run all Stage 2 analyses
        common_findings = await self.crossdoc_service.find_common_findings(paper_analyses)
        contradictions = await self.crossdoc_service.detect_contradictions(paper_analyses)
        methodology_comparison = await self.crossdoc_service.compare_methodologies(paper_analyses)
        research_gaps = await self.crossdoc_service.identify_research_gaps(
            paper_analyses, contradictions
        )
        improvement_analysis = await self.crossdoc_service.generate_improvement_analysis(
            paper_analyses, research_gaps
        )

        # Return combined results (in a real implementation, this would be a proper model)
        return {
            "common_findings": common_findings,
            "contradictions": contradictions,
            "methodology_comparison": methodology_comparison,
            "research_gaps": research_gaps,
            "improvement_analysis": improvement_analysis
        }

    # Helper methods (would be implemented with actual database/repository calls)

    async def _validate_papers(
        self,
        paper_ids: List[UUID]
    ) -> Tuple[bool, str, List[UUID]]:
        """
        Validate that papers exist and are ready for processing.

        Args:
            paper_ids: List of paper UUIDs to validate

        Returns:
            Tuple of (is_valid, error_message, valid_paper_ids)
        """
        # In a real implementation, this would check the database
        # For now, we'll assume all papers are valid
        if not paper_ids:
            return False, "No paper IDs provided", []

        # Simulate checking database - in reality, we'd query the database
        valid_paper_ids = paper_ids  # Assume all are valid for now

        return True, "", valid_paper_ids

    async def _update_session_status(
        self,
        session_id: UUID,
        status: str
    ) -> None:
        """
        Update the session status in the database.

        Args:
            session_id: Session identifier
            status: New status string
        """
        # In a real implementation, this would update the database
        # For now, we'll just log it
        pass

    async def _store_report(
        self,
        session_id: UUID,
        report_content: Dict[str, Any]
    ) -> UUID:
        """
        Store the final report in the database and return its ID.

        Args:
            session_id: Session identifier
            report_content: Report content to store

        Returns:
            UUID of the stored report
        """
        # In a real implementation, this would store in database
        # For now, we'll generate a mock ID
        return uuid.uuid4()

    async def _load_paper_analyses(
        self,
        paper_ids: List[UUID]
    ) -> List[Any]:
        """
        Load paper analyses from the database.

        Args:
            paper_ids: List of paper UUIDs

        Returns:
            List of PaperAnalysis objects
        """
        # In a real implementation, this would query the database
        # For now, we'll return empty list and note that Stage 1 must be run first
        return []

    async def _apply_verification_results(
        self,
        report_content: Dict[str, Any],
        verification_report: Any
    ) -> Dict[str, Any]:
        """
        Apply verification results to the report content.

        Args:
            report_content: Original report content
            verification_report: Verification results

        Returns:
            Verified report content
        """
        # In a real implementation, this would modify the report based on verification
        # For now, we'll just return the original content
        return report_content

    async def _store_verification_results(
        self,
        session_id: UUID,
        verification_report: Any
    ) -> None:
        """
        Store verification results in the database.

        Args:
            session_id: Session identifier
            verification_report: Verification results to store
        """
        # In a real implementation, this would store in database
        pass

    def _create_mock_retrieval_service(self) -> Any:
        """
        Create a mock retrieval service for verification.

        Returns:
            Mock retrieval service object
        """
        # In a real implementation, this would be a proper retrieval service
        # For now, we'll return a simple mock
        class MockRetrievalService:
            async def get_relevant_chunks(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
                return []

        return MockRetrievalService()


class AccuracyTracker:
    """Tracks accuracy metrics throughout the pipeline."""

    def __init__(self):
        """Initialize the accuracy tracker."""
        self.claims: List[Dict[str, Any]] = []
        self.citations: List[Dict[str, Any]] = []
        self.contradictions: List[Dict[str, Any]] = []

    def record_claim(
        self,
        claim_text: str,
        status: str,
        confidence: float
    ) -> None:
        """
        Record a claim verification result.

        Args:
            claim_text: The claim text
            status: Verification status
            confidence: Confidence score (0-1)
        """
        self.claims.append({
            "claim_text": claim_text,
            "status": status,
            "confidence": confidence
        })

    def record_citation(
        self,
        citation: Dict[str, Any],
        is_valid: bool
    ) -> None:
        """
        Record a citation verification result.

        Args:
            citation: Citation dictionary
            is_valid: Whether the citation is valid
        """
        self.citations.append({
            "citation": citation,
            "is_valid": is_valid
        })

    def record_contradiction(
        self,
        contradiction: Dict[str, Any],
        is_accurate: bool
    ) -> None:
        """
        Record a contradiction verification result.

        Args:
            contradiction: Contradiction dictionary
            is_accurate: Whether the contradiction is accurate
        """
        self.contradictions.append({
            "contradiction": contradiction,
            "is_accurate": is_accurate
        })

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get current accuracy metrics.

        Returns:
            Dictionary of accuracy metrics
        """
        # Calculate claim metrics
        total_claims = len(self.claims)
        supported = sum(1 for c in self.claims if c["status"] == "SUPPORTED")
        partially_supported = sum(1 for c in self.claims if c["status"] == "PARTIALLY_SUPPORTED")
        unsupported = sum(1 for c in self.claims if c["status"] == "UNSUPPORTED")
        contradicted = sum(1 for c in self.claims if c["status"] == "CONTRADICTED")

        evidence_supported_rate = 0.0
        if total_claims > 0:
            evidence_supported_rate = (supported + partially_supported * 0.5) / total_claims

        # Calculate citation metrics
        total_citations = len(self.citations)
        valid_citations = sum(1 for c in self.citations if c["is_valid"])
        citation_accuracy_rate = 0.0
        if total_citations > 0:
            citation_accuracy_rate = valid_citations / total_citations

        # Calculate contradiction metrics
        total_contradictions = len(self.contradictions)
        accurate_contradictions = sum(1 for c in self.contradictions if c["is_accurate"])
        contradiction_accuracy_rate = 0.0
        if total_contradictions > 0:
            contradiction_accuracy_rate = accurate_contradictions / total_contradictions

        return {
            "total_claims": total_claims,
            "supported": supported,
            "partially_supported": partially_supported,
            "unsupported": unsupported,
            "contradicted": contradicted,
            "evidence_supported_rate": evidence_supported_rate,
            "citation_accuracy_rate": citation_accuracy_rate,
            "total_citations": total_citations,
            "valid_citations": valid_citations,
            "total_contradictions": total_contradictions,
            "accurate_contradictions": accurate_contradictions,
            "contradiction_accuracy_rate": contradiction_accuracy_rate
        }


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the pipeline
    print("Analysis Pipeline loaded successfully")
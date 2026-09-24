"""API routes for analysis operations."""

from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.paper import PaperAnalysis
from app.services.analysis_service import PaperAnalysisService
from app.services.crossdoc_service import CrossDocumentAnalysisService


router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/analyze-batch", response_model=List[PaperAnalysis])
async def analyze_papers_batch(
    paper_ids: List[UUID],
    analysis_service: PaperAnalysisService = Depends()
):
    """
    Analyze multiple papers in batch.

    Args:
        paper_ids: List of paper IDs to analyze
        analysis_service: Injected analysis service

    Returns:
        List[PaperAnalysis]: Analysis results for each paper
    """
    try:
        analyses = await analysis_service.analyze_all_papers(paper_ids)
        return analyses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/common-findings")
async def find_common_findings(
    paper_analyses: List[PaperAnalysis],
    crossdoc_service: CrossDocumentAnalysisService = Depends()
):
    """
    Find common findings across multiple papers.

    Args:
        paper_analyses: List of paper analyses
        crossdoc_service: Injected cross-document analysis service

    Returns:
        List[CommonFinding]: Common findings across papers
    """
    try:
        common_findings = await crossdoc_service.find_common_findings(paper_analyses)
        return common_findings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Common findings analysis failed: {str(e)}"
        )


@router.post("/contradictions")
async def detect_contradictions(
    paper_analyses: List[PaperAnalysis],
    crossdoc_service: CrossDocumentAnalysisService = Depends()
):
    """
    Detect contradictions between papers.

    Args:
        paper_analyses: List of paper analyses
        crossdoc_service: Injected cross-document analysis service

    Returns:
        List[Contradiction]: Detected contradictions
    """
    try:
        contradictions = await crossdoc_service.detect_contradictions(paper_analyses)
        return contradictions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contradiction detection failed: {str(e)}"
        )


@router.post("/methodology-comparison")
async def compare_methodologies(
    paper_analyses: List[PaperAnalysis],
    crossdoc_service: CrossDocumentAnalysisService = Depends()
):
    """
    Compare methodologies across papers.

    Args:
        paper_analyses: List of paper analyses
        crossdoc_service: Injected cross-document analysis service

    Returns:
        MethodologyComparison: Methodology comparison results
    """
    try:
        methodology_comparison = await crossdoc_service.compare_methodologies(paper_analyses)
        return methodology_comparison
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Methodology comparison failed: {str(e)}"
        )


@router.post("/research-gaps")
async def identify_research_gaps(
    paper_analyses: List[PaperAnalysis],
    contradictions: List[dict] = [],
    crossdoc_service: CrossDocumentAnalysisService = Depends()
):
    """
    Identify research gaps based on paper analyses and contradictions.

    Args:
        paper_analyses: List of paper analyses
        contradictions: List of contradictions (optional)
        crossdoc_service: Injected cross-document analysis service

    Returns:
        List[ResearchGap]: Identified research gaps
    """
    try:
        # Convert contradiction dicts to Contradiction objects if needed
        contradiction_objects = []
        for contra in contradictions:
            if isinstance(contra, dict):
                # In a real implementation, we'd convert to Contradiction object
                # For now, we'll pass as-is and let the service handle it
                contradiction_objects.append(contra)
            else:
                contradiction_objects.append(contra)

        research_gaps = await crossdoc_service.identify_research_gaps(
            paper_analyses, contradiction_objects
        )
        return research_gaps
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Research gap identification failed: {str(e)}"
        )


@router.post("/improvement-analysis")
async def generate_improvement_analysis(
    paper_analyses: List[PaperAnalysis],
    research_gaps: List[dict] = [],
    crossdoc_service: CrossDocumentAnalysisService = Depends()
):
    """
    Generate improvement analysis based on paper analyses and research gaps.

    Args:
        paper_analyses: List of paper analyses
        research_gaps: List of research gaps (optional)
        crossdoc_service: Injected cross-document analysis service

    Returns:
        ImprovementAnalysis: Improvement analysis results
    """
    try:
        # Convert research gap dicts to ResearchGap objects if needed
        gap_objects = []
        for gap in research_gaps:
            if isinstance(gap, dict):
                # In a real implementation, we'd convert to ResearchGap object
                # For now, we'll pass as-is and let the service handle it
                gap_objects.append(gap)
            else:
                gap_objects.append(gap)

        improvement_analysis = await crossdoc_service.generate_improvement_analysis(
            paper_analyses, gap_objects
        )
        return improvement_analysis
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Improvement analysis failed: {str(e)}"
        )
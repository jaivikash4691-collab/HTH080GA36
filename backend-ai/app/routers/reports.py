"""API routes for report generation and retrieval."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.paper import Report
from app.services.report_service import ReportGenerationService
from app.services.verification_service import ClaimVerificationService


router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=Report)
async def generate_report(
    session_id: UUID,
    paper_analyses: List[dict],
    cross_analysis: dict,
    verification_report: dict,
    report_service: ReportGenerationService = Depends()
):
    """
    Generate a complete synthesis report.

    Args:
        session_id: Unique session identifier
        paper_analyses: List of paper analysis dictionaries
        cross_analysis: Dictionary containing cross-analysis results
        verification_report: Verification report dictionary
        report_service: Injected report generation service

    Returns:
        Report: The generated synthesis report
    """
    try:
        # Convert dictionaries to appropriate objects if needed
        # For now, we'll pass them as-is and let the service handle conversion

        report = await report_service.assemble_full_report(
            session_id=session_id,
            paper_analyses=paper_analyses,
            cross_analysis=cross_analysis,
            verification_report=verification_report
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
        )


@router.get("/{report_id}", response_model=Report)
async def get_report(
    report_id: UUID,
    report_service: ReportGenerationService = Depends()
):
    """
    Get a specific report by ID.

    Args:
        report_id: The report ID
        report_service: Injected report generation service

    Returns:
        Report: The report record

    Raises:
        HTTPException: If report not found
    """
    # In a real implementation, this would query the database
    # For now, we'll raise 404
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Report not found"
    )


@router.get("/", response_model=List[Report])
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    session_id: Optional[UUID] = None,
    report_service: ReportGenerationService = Depends()
):
    """
    List reports with optional filtering.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        session_id: Optional session ID filter
        report_service: Injected report generation service

    Returns:
        List[Report]: List of report records
    """
    # In a real implementation, this would query the database
    # For now, we'll return an empty list
    return []


@router.post("/{report_id}/verify")
async def verify_report(
    report_id: UUID,
    verification_service: ClaimVerificationService = Depends()
):
    """
    Trigger verification for a specific report.

    Args:
        report_id: The report ID
        verification_service: Injected verification service

    Returns:
        dict: Confirmation message
    """
    # In a real implementation, this would:
    # 1. Retrieve the report from database
    # 2. Run claim verification on the report
    # 3. Update verification status

    # For now, we'll return a confirmation
    return {"message": f"Verification started for report {report_id}"}


@router.get("/{report_id}/verification")
async def get_report_verification(
    report_id: UUID,
    verification_service: ClaimVerificationService = Depends()
):
    """
    Get verification results for a specific report.

    Args:
        report_id: The report ID
        verification_service: Injected verification service

    Returns:
        VerificationReport: The verification results

    Raises:
        HTTPException: If report not found or verification not available
    """
    # In a real implementation, this would query the database for verification results
    # For now, we'll raise 404
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Verification results not found"
    )
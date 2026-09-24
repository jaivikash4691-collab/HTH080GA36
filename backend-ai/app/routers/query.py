"""API routes for query and search operations."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.paper import Paper, Chunk
from app.services.qa_service import QAService, QuestionClassification, QAResponse
from app.services.verification_service import ClaimVerificationService


router = APIRouter(prefix="/query", tags=["query"])


@router.post("/search", response_model=List[Chunk])
async def search_chunks(
    query: str,
    limit: int = 10,
    # retrieval_service: Any = Depends()  # Would be injected in real implementation
):
    """
    Search for relevant chunks based on a query.

    Args:
        query: The search query
        limit: Maximum number of results to return
        retrieval_service: Injected retrieval service

    Returns:
        List[Chunk]: Relevant chunks matching the query
    """
    # In a real implementation, this would:
    # 1. Use the retrieval_service to search for relevant chunks
    # 2. Return the results

    # For now, we'll return an empty list
    return []


@router.post("/question/classify", response_model=QuestionClassification)
async def classify_question(
    question: str,
    qa_service: QAService = Depends()
):
    """
    Classify a question to determine the best retrieval strategy.

    Args:
        question: The question to classify
        qa_service: Injected QA service

    Returns:
        QuestionClassification: The classification result
    """
    try:
        classification = await qa_service.classify_question(question)
        return classification
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Question classification failed: {str(e)}"
        )


@router.post("/question/answer", response_model=QAResponse)
async def answer_question(
    question: str,
    retrieved_chunks: List[dict],
    paper_analyses: List[dict] = [],
    session_context: List[dict] = [],
    qa_service: QAService = Depends()
):
    """
    Answer a question based on retrieved evidence.

    Args:
        question: The question to answer
        retrieved_chunks: List of retrieved chunks with metadata
        paper_analyses: List of paper analyses for context
        session_context: List of previous conversation context
        qa_service: Injected QA service

    Returns:
        QAResponse: The answer with citations and confidence
    """
    try:
        # Convert dictionaries to appropriate objects if needed
        # For now, we'll pass them as-is and let the service handle conversion

        response = await qa_service.answer_question(
            question=question,
            retrieved_chunks=retrieved_chunks,
            paper_analyses=paper_analyses,
            session_context=session_context
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Question answering failed: {str(e)}"
        )


@router.post("/question/answer-comparison", response_model=QAResponse)
async def answer_comparison_question(
    question: str,
    paper_a_chunks: List[dict],
    paper_b_chunks: List[dict],
    paper_a_analysis: dict,
    paper_b_analysis: dict,
    qa_service: QAService = Depends()
):
    """
    Answer a comparison question between two papers.

    Args:
        question: The comparison question
        paper_a_chunks: Chunks from paper A
        paper_b_chunks: Chunks from paper B
        paper_a_analysis: Analysis of paper A
        paper_b_analysis: Analysis of paper B
        qa_service: Injected QA service

    Returns:
        QAResponse: The comparative answer with citations and confidence
    """
    try:
        # Convert dictionaries to appropriate objects if needed
        # For now, we'll pass them as-is and let the service handle conversion

        response = await qa_service.answer_comparison_question(
            question=question,
            paper_a_chunks=paper_a_chunks,
            paper_b_chunks=paper_b_chunks,
            paper_a_analysis=paper_a_analysis,
            paper_b_analysis=paper_b_analysis
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparative question answering failed: {str(e)}"
        )


@router.post("/question/handle-followup", response_model=QAResponse)
async def handle_followup_question(
    original_question: str,
    original_answer: str,
    followup_question: str,
    retrieved_chunks: List[dict],
    qa_service: QAService = Depends()
):
    """
    Handle a follow-up question using original context and new evidence.

    Args:
        original_question: The original question
        original_answer: The original answer
        followup_question: The follow-up question
        retrieved_chunks: List of retrieved chunks with metadata
        qa_service: Injected QA service

    Returns:
        QAResponse: The follow-up answer with citations and confidence
    """
    try:
        # Convert dictionaries to appropriate objects if needed
        # For now, we'll pass them as-is and let the service handle conversion

        response = await qa_service.handle_followup(
            original_question=original_question,
            original_answer=original_answer,
            followup_question=followup_question,
            retrieved_chunks=retrieved_chunks
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Follow-up question handling failed: {str(e)}"
        )


@router.post("/claims/extract")
async def extract_claims(
    text: str,
    paper_analyses: List[dict] = [],
    verification_service: ClaimVerificationService = Depends()
):
    """
    Extract factual claims from text.

    Args:
        text: Text to extract claims from
        paper_analyses: List of paper analyses for context
        verification_service: Injected verification service

    Returns:
        List[Claim]: Extracted claims
    """
    try:
        # Convert dictionaries to appropriate objects if needed
        # For now, we'll pass them as-is and let the service handle conversion

        claims = await verification_service.extract_claims(text, paper_analyses)
        return claims
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Claim extraction failed: {str(e)}"
        )


@router.post("/claims/verify")
async def verify_claim(
    claim: dict,
    retrieved_chunks: List[dict],
    verification_service: ClaimVerificationService = Depends()
):
    """
    Verify a claim against retrieved evidence.

    Args:
        claim: Claim to verify
        retrieved_chunks: List of retrieved chunks with metadata
        verification_service: Injected verification service

    Returns:
        ClaimVerification: Verification result
    """
    try:
        # Convert claim dict to Claim object if needed
        # For now, we'll pass as-is and let the service handle conversion

        verification = await verification_service.verify_claim(claim, retrieved_chunks)
        return verification
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Claim verification failed: {str(e)}"
        )
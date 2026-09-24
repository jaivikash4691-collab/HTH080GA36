from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.config import settings
from app.services.qa_service import QAService, QuestionClassification, QAResponse
from app.services.analysis_service import PaperAnalysis

# Import new routers
from app.routers import papers, analysis, reports, query, evidence


app = FastAPI(
    title="Research Synthesis Assistant API",
    description="AI-powered multi-paper research analysis and synthesis backend",
    version="1.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Include Routers
# ---------------------------------------------------------

app.include_router(papers.router)
app.include_router(analysis.router)
app.include_router(reports.router)
app.include_router(query.router)
app.include_router(evidence.router)


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------


@app.get("/")
async def root():
    return {
        "name": "Research Synthesis Assistant API",
        "status": "running",
        "version": "1.0.0",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
    }


# ---------------------------------------------------------
# Configuration check
# ---------------------------------------------------------


@app.get("/config")
async def config():
    return {
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "llm_temperature": settings.llm_temperature,
        "llm_max_tokens": settings.llm_max_tokens,
        "llm_timeout": settings.llm_timeout,
        "embedding_model": settings.embedding_model,
        "embedding_dimension": settings.embedding_dimension,
        "reranking_enabled": settings.reranking_enabled,
        "verification_enabled": settings.verification_enabled,
    }


# ---------------------------------------------------------
# QA Service Endpoints
# ---------------------------------------------------------

qa_service = QAService()


class ClassifyQuestionRequest(BaseModel):
    question: str


@app.post("/qa/classify")
async def classify_question(request: ClassifyQuestionRequest):
    """
    Classify a user question to determine the best retrieval strategy.
    """
    try:
        classification = await qa_service.classify_question(request.question)
        return classification
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AnswerQuestionRequest(BaseModel):
    question: str
    retrieved_chunks: List[Dict[str, Any]]
    paper_analyses: List[PaperAnalysis]
    session_context: List[Dict[str, Any]] = []


@app.post("/qa/answer")
async def answer_question(request: AnswerQuestionRequest):
    """
    Answer a user question based on retrieved evidence.
    """
    try:
        response = await qa_service.answer_question(
            question=request.question,
            retrieved_chunks=request.retrieved_chunks,
            paper_analyses=request.paper_analyses,
            session_context=request.session_context
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AnswerComparisonQuestionRequest(BaseModel):
    question: str
    paper_a_chunks: List[Dict[str, Any]]
    paper_b_chunks: List[Dict[str, Any]]
    paper_a_analysis: PaperAnalysis
    paper_b_analysis: PaperAnalysis


@app.post("/qa/answer-comparison")
async def answer_comparison_question(request: AnswerComparisonQuestionRequest):
    """
    Answer a comparison question between two papers.
    """
    try:
        response = await qa_service.answer_comparison_question(
            question=request.question,
            paper_a_chunks=request.paper_a_chunks,
            paper_b_chunks=request.paper_b_chunks,
            paper_a_analysis=request.paper_a_analysis,
            paper_b_analysis=request.paper_b_analysis
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class HandleFollowupRequest(BaseModel):
    original_question: str
    original_answer: str
    followup_question: str
    retrieved_chunks: List[Dict[str, Any]]


@app.post("/qa/handle-followup")
async def handle_followup(request: HandleFollowupRequest):
    """
    Handle a follow-up question using original context and new evidence.
    """
    try:
        response = await qa_service.handle_followup(
            original_question=request.original_question,
            original_answer=request.original_answer,
            followup_question=request.followup_question,
            retrieved_chunks=request.retrieved_chunks
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""API routes for analysis operations."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.schemas.analysis import (
    BatchAnalysisRequest,
    BatchAnalysisResponse,
    AnalysisError,
    PaperAnalysisSchema,
    CrossDocRequest,
)
from app.schemas.crossdoc import (
    CommonFindingsResponse,
    CommonFindingSchema,
    ContradictionsResponse,
    ContradictionSchema,
    MethodologyComparisonResponse,
    MethodologyComparisonAspect,
    ResearchGapsResponse,
    ResearchGapSchema,
    ImprovementAnalysisResponse,
    ImprovementSchema,
)
from app.schemas.common import APIResponse, EvidenceReference
from app.store import store

log = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _coerce_evidence(raw_list: List[Any], paper_id: UUID) -> List[EvidenceReference]:
    """Convert raw evidence dicts from LLM services into EvidenceReference objects."""
    result: List[EvidenceReference] = []
    for item in raw_list:
        if isinstance(item, dict):
            try:
                ev = EvidenceReference(
                    paper_id=item.get("paper_id", paper_id),
                    chunk_id=item.get("chunk_id"),
                    page_number=item.get("page") or item.get("page_number"),
                    section=item.get("section"),
                    quote=item.get("passage") or item.get("quote"),
                    relevance_score=item.get("score") or item.get("relevance_score"),
                )
                result.append(ev)
            except Exception:
                pass
    return result


def _analysis_to_schema(analysis: Any, paper_id: UUID, paper_meta: Dict[str, Any]) -> PaperAnalysisSchema:
    """Convert a PaperAnalysis service object to the canonical API schema."""
    if hasattr(analysis, "model_dump"):
        raw = analysis.model_dump()
    elif isinstance(analysis, dict):
        raw = analysis
    else:
        raw = {}

    # Build methodology string
    method_obj = raw.get("methodology", {})
    if isinstance(method_obj, dict):
        method_str = method_obj.get("approach", "not_available")
        dataset = method_obj.get("dataset", None)
    else:
        method_str = str(method_obj) if method_obj else "not_available"
        dataset = None

    # Build findings list
    key_findings = raw.get("key_findings", [])
    findings_out: List[Any] = []
    for f in key_findings:
        if isinstance(f, dict):
            findings_out.append({
                "finding": f.get("finding", ""),
                "label": f.get("label", "PAPER_REPORTED"),
                "evidence": f.get("evidence", {}),
            })

    # Strengths / weaknesses / limitations
    strengths = [a.get("advantage", "") if isinstance(a, dict) else str(a) for a in raw.get("advantages", [])]
    weaknesses = [d.get("disadvantage", "") if isinstance(d, dict) else str(d) for d in raw.get("disadvantages", [])]
    limitations = [l.get("limitation", "") if isinstance(l, dict) else str(l) for l in raw.get("limitations", [])]

    return PaperAnalysisSchema(
        paper_id=paper_id,
        title=paper_meta.get("title", "Unknown"),
        objective=raw.get("objective", "not_available"),
        research_question=raw.get("research_problem") or None,
        domain=raw.get("domain") or None,
        methodology=method_str,
        dataset=dataset,
        findings=findings_out,
        strengths=strengths,
        weaknesses=weaknesses,
        limitations=limitations,
        evidence=_coerce_evidence(key_findings, paper_id),
        confidence=0.8 if raw.get("objective") not in ("Not reported", None, "") else 0.3,
        analysis_status="completed",
    )


# ---------------------------------------------------------------------------
# POST /analysis/analyze-batch
# ---------------------------------------------------------------------------


@router.post("/analyze-batch")
async def analyze_papers_batch(request: BatchAnalysisRequest):
    """Analyze 1–8 papers in batch.

    Validates all paper IDs exist, runs individual paper analysis
    (with configurable parallelism), stores results, and returns
    a BatchAnalysisResponse.

    Request body::

        {
            "paper_ids": ["<uuid>", ...],
            "options": {"parallel": true, "include_evidence": true, ...}
        }

    Returns:
        APIResponse wrapping BatchAnalysisResponse.

    Error codes:
        PAPER_NOT_FOUND         – one or more paper IDs not in store
        INVALID_PAPER_COUNT     – request contains 0 or >8 IDs
        ANALYSIS_FAILED         – all analyses failed
    """
    paper_ids = request.paper_ids
    options = request.options
    session_id = uuid.uuid4()

    # Validate all papers exist
    missing: List[str] = []
    for pid in paper_ids:
        if not await store.paper_exists(pid):
            missing.append(str(pid))

    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"Papers not found: {', '.join(missing)}",
                code="PAPER_NOT_FOUND",
                details={"missing_ids": missing},
            ).model_dump(),
        )

    # Create session
    await store.create_session(session_id)
    await store.update_session(session_id, {"paper_ids": [str(p) for p in paper_ids], "status": "processing"})

    # Load service
    from app.services.analysis_service import PaperAnalysisService
    from app.config import settings as cfg

    analysis_service = PaperAnalysisService()

    analyses_out: List[PaperAnalysisSchema] = []
    errors_out: List[AnalysisError] = []

    async def _analyze_one(pid: UUID) -> None:
        paper_meta = await store.get_paper(pid) or {}
        chunks = await store.get_chunks(pid)

        # If paper has not been chunked yet, extract and chunk on-the-fly
        if not chunks and paper_meta.get("file_path") and os.path.exists(paper_meta["file_path"]):
            try:
                from app.services.pdf_service import PDFService
                from app.services.chunking_service import ChunkingService
                pdf_svc = PDFService()
                chunk_svc = ChunkingService()
                extraction = pdf_svc.extract_text(paper_meta["file_path"])
                text = extraction.get("text", "")
                if text:
                    chunks_raw = chunk_svc.chunk_text(
                        text=text,
                        paper_id=pid,
                        metadata={"total_pages": extraction.get("num_pages", 0)},
                    )
                    chunks_dicts = []
                    for c in chunks_raw:
                        if hasattr(c, "model_dump"):
                            cd = c.model_dump()
                        elif isinstance(c, dict):
                            cd = dict(c)
                        else:
                            continue
                        cd["paper_id"] = str(pid)
                        cd.setdefault("chunk_id", str(uuid.uuid4()))
                        chunks_dicts.append(cd)
                    await store.save_chunks(pid, chunks_dicts)
                    chunks = chunks_dicts
                    await store.update_paper_status(pid, "processed")
            except Exception as e:
                log.warning("Auto-chunking during batch analysis for paper %s failed: %s", pid, e)

        try:
            analysis = await analysis_service.analyze_paper(
                paper_id=pid,
                paper_metadata=paper_meta,
                chunks=chunks,
            )
            schema = _analysis_to_schema(analysis, pid, paper_meta)
            analyses_out.append(schema)
            # Persist
            await store.save_analysis(pid, schema.model_dump(mode="json"))
        except Exception as exc:
            log.error("Analysis failed for paper %s: %s", pid, exc)
            errors_out.append(AnalysisError(
                paper_id=pid,
                code="ANALYSIS_FAILED",
                message=str(exc)[:300],
            ))

    # Run with concurrency limit
    if options.parallel and cfg.parallel_analysis:
        sem = asyncio.Semaphore(min(cfg.max_parallel_llm_requests, len(paper_ids)))

        async def _bounded(pid: UUID) -> None:
            async with sem:
                await _analyze_one(pid)

        await asyncio.gather(*[_bounded(p) for p in paper_ids])
    else:
        for pid in paper_ids:
            await _analyze_one(pid)

    status_val = "completed"
    if analyses_out and errors_out:
        status_val = "partial"
    elif not analyses_out:
        status_val = "failed"

    await store.update_session(session_id, {"status": status_val})

    response_data = BatchAnalysisResponse(
        session_id=session_id,
        status=status_val,
        papers_requested=len(paper_ids),
        papers_completed=len(analyses_out),
        papers_failed=len(errors_out),
        analyses=analyses_out,
        errors=errors_out,
    )

    return APIResponse.ok(data=response_data.model_dump(mode="json")).model_dump()


# ---------------------------------------------------------------------------
# POST /analysis/common-findings
# ---------------------------------------------------------------------------


@router.post("/common-findings")
async def find_common_findings(request: CrossDocRequest):
    """Find common findings across papers specified by paper_ids.

    Returns:
        APIResponse wrapping CommonFindingsResponse.
    """
    paper_ids = request.paper_ids

    # Validate papers and load analyses
    analyses, missing = await _load_analyses(paper_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"No analysis found for papers: {', '.join(str(m) for m in missing)}. "
                "Run POST /analysis/analyze-batch first.",
                code="ANALYSIS_NOT_FOUND",
                details={"missing_ids": [str(m) for m in missing]},
            ).model_dump(),
        )

    from app.services.crossdoc_service import CrossDocumentAnalysisService
    from app.services.analysis_service import PaperAnalysis

    svc = CrossDocumentAnalysisService()
    paper_analyses = [PaperAnalysis(**_strip_schema_fields(a)) for a in analyses]

    try:
        raw_findings = await svc.find_common_findings(paper_analyses)
    except Exception as exc:
        log.error("Common findings failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail("Common findings analysis failed", code="ANALYSIS_FAILED").model_dump(),
        )

    findings_out: List[CommonFindingSchema] = []
    for i, f in enumerate(raw_findings or []):
        if hasattr(f, "model_dump"):
            fd = f.model_dump()
        elif isinstance(f, dict):
            fd = f
        else:
            fd = {}
        findings_out.append(CommonFindingSchema(
            finding_id=fd.get("finding_id", f"finding_{i}"),
            statement=fd.get("finding", fd.get("statement", "")),
            supporting_papers=fd.get("supporting_papers", []),
            confidence=_coerce_float(fd.get("confidence", 0.5)),
        ))

    return APIResponse.ok(
        data=CommonFindingsResponse(findings=findings_out).model_dump(mode="json")
    ).model_dump()


# ---------------------------------------------------------------------------
# POST /analysis/contradictions
# ---------------------------------------------------------------------------


@router.post("/contradictions")
async def detect_contradictions(request: CrossDocRequest):
    """Detect contradictions between papers.

    Returns:
        APIResponse wrapping ContradictionsResponse.
    """
    paper_ids = request.paper_ids
    analyses, missing = await _load_analyses(paper_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"No analysis for papers: {', '.join(str(m) for m in missing)}",
                code="ANALYSIS_NOT_FOUND",
            ).model_dump(),
        )

    from app.services.crossdoc_service import CrossDocumentAnalysisService
    from app.services.analysis_service import PaperAnalysis

    svc = CrossDocumentAnalysisService()
    paper_analyses = [PaperAnalysis(**_strip_schema_fields(a)) for a in analyses]

    try:
        raw = await svc.detect_contradictions(paper_analyses)
    except Exception as exc:
        log.error("Contradiction detection failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail("Contradiction detection failed", code="ANALYSIS_FAILED").model_dump(),
        )

    contradictions_out: List[ContradictionSchema] = []
    for i, c in enumerate(raw or []):
        if hasattr(c, "model_dump"):
            cd = c.model_dump()
        elif isinstance(c, dict):
            cd = c
        else:
            cd = {}
        contradictions_out.append(ContradictionSchema(
            contradiction_id=cd.get("contradiction_id", f"contradiction_{i}"),
            topic=cd.get("topic", ""),
            paper_a=cd.get("paper_a", {}),
            paper_b=cd.get("paper_b", {}),
            claim_a=cd.get("claim_a", ""),
            claim_b=cd.get("claim_b", ""),
            methodological_difference=cd.get("methodological_difference"),
            possible_explanation=cd.get("possible_explanation") or (
                ", ".join(cd.get("possible_reasons", [])) if cd.get("possible_reasons") else None
            ),
            confidence=_coerce_float(cd.get("confidence", 0.5)),
        ))

    return APIResponse.ok(
        data=ContradictionsResponse(contradictions=contradictions_out).model_dump(mode="json")
    ).model_dump()


# ---------------------------------------------------------------------------
# POST /analysis/methodology-comparison
# ---------------------------------------------------------------------------


@router.post("/methodology-comparison")
async def compare_methodologies(request: CrossDocRequest):
    """Compare methodologies across papers.

    Returns:
        APIResponse wrapping MethodologyComparisonResponse.
    """
    paper_ids = request.paper_ids
    analyses, missing = await _load_analyses(paper_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"No analysis for papers: {', '.join(str(m) for m in missing)}",
                code="ANALYSIS_NOT_FOUND",
            ).model_dump(),
        )

    from app.services.crossdoc_service import CrossDocumentAnalysisService
    from app.services.analysis_service import PaperAnalysis

    svc = CrossDocumentAnalysisService()
    paper_analyses = [PaperAnalysis(**_strip_schema_fields(a)) for a in analyses]

    try:
        raw = await svc.compare_methodologies(paper_analyses)
    except Exception as exc:
        log.error("Methodology comparison failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail("Methodology comparison failed", code="ANALYSIS_FAILED").model_dump(),
        )

    if hasattr(raw, "model_dump"):
        raw_dict = raw.model_dump()
    elif isinstance(raw, dict):
        raw_dict = raw
    else:
        raw_dict = {}

    comparison_table = raw_dict.get("comparison_table", [])
    insights = raw_dict.get("methodology_insights", [])

    comparisons_out: List[MethodologyComparisonAspect] = []
    for i, row in enumerate(comparison_table):
        if isinstance(row, dict):
            comparisons_out.append(MethodologyComparisonAspect(
                aspect=row.get("aspect", "method"),
                papers=row.get("papers", []),
                comparison=str(row.get("value", row.get("comparison", ""))),
                similarities=row.get("similarities", []),
                differences=row.get("differences", []),
            ))
    # Add insights as a final entry if present
    if insights and not comparisons_out:
        comparisons_out.append(MethodologyComparisonAspect(
            aspect="general",
            papers=[],
            comparison="; ".join(insights),
        ))

    return APIResponse.ok(
        data=MethodologyComparisonResponse(comparisons=comparisons_out).model_dump(mode="json")
    ).model_dump()


# ---------------------------------------------------------------------------
# POST /analysis/research-gaps
# ---------------------------------------------------------------------------


@router.post("/research-gaps")
async def identify_research_gaps(request: CrossDocRequest):
    """Identify research gaps.

    Returns:
        APIResponse wrapping ResearchGapsResponse.
    """
    paper_ids = request.paper_ids
    analyses, missing = await _load_analyses(paper_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"No analysis for papers: {', '.join(str(m) for m in missing)}",
                code="ANALYSIS_NOT_FOUND",
            ).model_dump(),
        )

    from app.services.crossdoc_service import CrossDocumentAnalysisService
    from app.services.analysis_service import PaperAnalysis

    svc = CrossDocumentAnalysisService()
    paper_analyses = [PaperAnalysis(**_strip_schema_fields(a)) for a in analyses]

    try:
        raw = await svc.identify_research_gaps(paper_analyses, [])
    except Exception as exc:
        log.error("Research gaps failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail("Research gap identification failed", code="ANALYSIS_FAILED").model_dump(),
        )

    gaps_out: List[ResearchGapSchema] = []
    for i, g in enumerate(raw or []):
        if hasattr(g, "model_dump"):
            gd = g.model_dump()
        elif isinstance(g, dict):
            gd = g
        else:
            gd = {}
        gaps_out.append(ResearchGapSchema(
            gap_id=gd.get("gap_id", f"gap_{i}"),
            description=gd.get("gap", gd.get("description", "")),
            supporting_papers=gd.get("evidence_from_papers", gd.get("supporting_papers", [])),
            why_gap_exists=gd.get("why_it_matters", ""),
            potential_direction=gd.get("suggested_direction", gd.get("potential_direction", "")),
            expected_value=gd.get("expected_value", ""),
            confidence=_coerce_float(gd.get("confidence", 0.5)),
        ))

    return APIResponse.ok(
        data=ResearchGapsResponse(gaps=gaps_out).model_dump(mode="json")
    ).model_dump()


# ---------------------------------------------------------------------------
# POST /analysis/improvement-analysis
# ---------------------------------------------------------------------------


@router.post("/improvement-analysis")
async def generate_improvement_analysis(request: CrossDocRequest):
    """Generate improvement recommendations.

    Returns:
        APIResponse wrapping ImprovementAnalysisResponse.
    """
    paper_ids = request.paper_ids
    analyses, missing = await _load_analyses(paper_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIResponse.fail(
                f"No analysis for papers: {', '.join(str(m) for m in missing)}",
                code="ANALYSIS_NOT_FOUND",
            ).model_dump(),
        )

    from app.services.crossdoc_service import CrossDocumentAnalysisService
    from app.services.analysis_service import PaperAnalysis

    svc = CrossDocumentAnalysisService()
    paper_analyses = [PaperAnalysis(**_strip_schema_fields(a)) for a in analyses]

    try:
        raw = await svc.generate_improvement_analysis(paper_analyses, [])
    except Exception as exc:
        log.error("Improvement analysis failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIResponse.fail("Improvement analysis failed", code="ANALYSIS_FAILED").model_dump(),
        )

    improvements_out: List[ImprovementSchema] = []

    if hasattr(raw, "model_dump"):
        raw_dict = raw.model_dump()
    elif isinstance(raw, dict):
        raw_dict = raw
    else:
        raw_dict = {}

    # Merge all improvement categories
    all_improvements = (
        raw_dict.get("effectiveness_improvements", [])
        + raw_dict.get("disadvantage_mitigations", [])
        + raw_dict.get("application_recommendations", [])
    )

    for i, item in enumerate(all_improvements):
        if isinstance(item, dict):
            improvements_out.append(ImprovementSchema(
                problem=item.get("problem", item.get("title", "")),
                affected_papers=item.get("affected_papers", []),
                why_it_matters=item.get("why_it_matters", item.get("rationale", "")),
                recommended_solution=item.get("recommended_solution", item.get("solution", "")),
                expected_improvement=item.get("expected_improvement", item.get("expected_outcome", "")),
                priority=_coerce_priority(item.get("priority", "medium")),
                confidence=_coerce_float(item.get("confidence", 0.5)),
            ))

    return APIResponse.ok(
        data=ImprovementAnalysisResponse(improvements=improvements_out).model_dump(mode="json")
    ).model_dump()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _load_analyses(paper_ids: List[UUID]):
    """Load stored analyses for paper_ids. Returns (analyses, missing_ids)."""
    analyses: List[Dict[str, Any]] = []
    missing: List[UUID] = []
    for pid in paper_ids:
        analysis = await store.get_analysis(pid)
        if analysis:
            analyses.append(analysis)
        else:
            missing.append(pid)
    return analyses, missing


def _strip_schema_fields(d: Dict[str, Any]) -> Dict[str, Any]:
    """Remove schema-only fields that PaperAnalysis service model doesn't accept."""
    _SCHEMA_ONLY = {"paper_id", "title", "research_question", "strengths", "weaknesses",
                    "analysis_status", "claims", "evidence", "confidence", "experiments",
                    "quantitative_results", "dataset"}
    return {k: v for k, v in d.items() if k not in _SCHEMA_ONLY}


def _coerce_float(val: Any, default: float = 0.0) -> float:
    try:
        v = float(val)
        return max(0.0, min(1.0, v))
    except (TypeError, ValueError):
        return default


def _coerce_priority(val: Any) -> str:
    v = str(val).lower()
    if v in ("low", "medium", "high"):
        return v
    return "medium"
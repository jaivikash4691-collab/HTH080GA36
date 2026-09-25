"""API contract schemas (Pydantic request/response models)."""

from __future__ import annotations

from .common import (
    APIResponse,
    ErrorDetail,
    EvidenceReference,
    ClaimSchema,
    PaperReference,
)
from .analysis import (
    BatchAnalysisRequest,
    BatchAnalysisOptions,
    BatchAnalysisResponse,
    AnalysisError,
    PaperAnalysisSchema,
)
from .crossdoc import (
    CrossDocRequest,
    CommonFindingSchema,
    CommonFindingsResponse,
    ContradictionSchema,
    ContradictionsResponse,
    MethodologyComparisonResponse,
    ResearchGapSchema,
    ResearchGapsResponse,
    ImprovementSchema,
    ImprovementAnalysisResponse,
)
from .report import (
    GenerateReportRequest,
    GenerateReportOptions,
    GenerateReportResponse,
    FinalReport,
    VerificationResponse,
)

__all__ = [
    # common
    "APIResponse",
    "ErrorDetail",
    "EvidenceReference",
    "ClaimSchema",
    "PaperReference",
    # analysis
    "BatchAnalysisRequest",
    "BatchAnalysisOptions",
    "BatchAnalysisResponse",
    "AnalysisError",
    "PaperAnalysisSchema",
    # crossdoc
    "CrossDocRequest",
    "CommonFindingSchema",
    "CommonFindingsResponse",
    "ContradictionSchema",
    "ContradictionsResponse",
    "MethodologyComparisonResponse",
    "ResearchGapSchema",
    "ResearchGapsResponse",
    "ImprovementSchema",
    "ImprovementAnalysisResponse",
    # report
    "GenerateReportRequest",
    "GenerateReportOptions",
    "GenerateReportResponse",
    "FinalReport",
    "VerificationResponse",
]

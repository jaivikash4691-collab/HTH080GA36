"""API routers package."""

from __future__ import annotations

# Import routers to make them available at package level
from . import papers, analysis, reports, query, evidence

__all__ = ["papers", "analysis", "reports", "query", "evidence"]
"""In-memory store for papers, sessions, analyses, and reports.

This module provides a lightweight runtime store so the API works end-to-end
without a database.  It is intentionally simple:
  - Thread/coroutine safe via asyncio.Lock
  - Data is lost on restart (acceptable for development / demo)
  - Replace with a real DB layer (Supabase, Postgres) for production

Store topology:
  _papers:   dict[UUID, dict]                      # paper metadata
  _chunks:   dict[UUID, list[dict]]                # paper_id -> chunks
  _analyses: dict[UUID, dict]                      # paper_id -> analysis result
  _sessions: dict[UUID, dict]                      # session metadata
  _reports:  dict[UUID, dict]                      # report_id -> FinalReport dict
"""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class InMemoryStore:
    """Thread-safe in-memory key-value store for all runtime data."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._papers: Dict[str, Dict[str, Any]] = {}
        self._chunks: Dict[str, List[Dict[str, Any]]] = {}
        self._analyses: Dict[str, Dict[str, Any]] = {}
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._reports: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Papers
    # ------------------------------------------------------------------

    async def save_paper(self, paper: Dict[str, Any]) -> None:
        """Upsert a paper record keyed by paper_id."""
        async with self._lock:
            self._papers[str(paper["paper_id"])] = deepcopy(paper)

    async def get_paper(self, paper_id: UUID) -> Optional[Dict[str, Any]]:
        """Return paper dict or None."""
        async with self._lock:
            data = self._papers.get(str(paper_id))
            return deepcopy(data) if data else None

    async def list_papers(
        self,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Return paper records, optionally filtered by processing_status."""
        async with self._lock:
            all_papers = list(self._papers.values())
        if status:
            all_papers = [p for p in all_papers if p.get("processing_status") == status]
        return [deepcopy(p) for p in all_papers[skip : skip + limit]]

    async def delete_paper(self, paper_id: UUID) -> bool:
        """Delete a paper and its chunks/analysis. Returns True if existed."""
        pid = str(paper_id)
        async with self._lock:
            existed = pid in self._papers
            self._papers.pop(pid, None)
            self._chunks.pop(pid, None)
            self._analyses.pop(pid, None)
        return existed

    async def paper_exists(self, paper_id: UUID) -> bool:
        async with self._lock:
            return str(paper_id) in self._papers

    async def update_paper_status(self, paper_id: UUID, status: str) -> None:
        """Update processing_status and optionally set processed_at timestamp."""
        pid = str(paper_id)
        async with self._lock:
            if pid in self._papers:
                self._papers[pid]["processing_status"] = status
                if status in ("processed", "failed"):
                    self._papers[pid]["processed_at"] = _now_iso()

    # ------------------------------------------------------------------
    # Chunks
    # ------------------------------------------------------------------

    async def save_chunks(self, paper_id: UUID, chunks: List[Dict[str, Any]]) -> None:
        async with self._lock:
            self._chunks[str(paper_id)] = deepcopy(chunks)

    async def get_chunks(
        self,
        paper_id: UUID,
        section: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            all_chunks = self._chunks.get(str(paper_id), [])
        if section:
            all_chunks = [c for c in all_chunks if c.get("section", "").lower() == section.lower()]
        return [deepcopy(c) for c in all_chunks[skip : skip + limit]]

    async def get_chunk_by_id(self, chunk_id: UUID) -> Optional[Dict[str, Any]]:
        cid = str(chunk_id)
        async with self._lock:
            for chunks in self._chunks.values():
                for c in chunks:
                    if str(c.get("chunk_id")) == cid:
                        return deepcopy(c)
        return None

    # ------------------------------------------------------------------
    # Analyses
    # ------------------------------------------------------------------

    async def save_analysis(self, paper_id: UUID, analysis: Dict[str, Any]) -> None:
        async with self._lock:
            self._analyses[str(paper_id)] = deepcopy(analysis)

    async def get_analysis(self, paper_id: UUID) -> Optional[Dict[str, Any]]:
        async with self._lock:
            data = self._analyses.get(str(paper_id))
            return deepcopy(data) if data else None

    async def get_many_analyses(self, paper_ids: List[UUID]) -> List[Dict[str, Any]]:
        async with self._lock:
            results = []
            for pid in paper_ids:
                data = self._analyses.get(str(pid))
                if data:
                    results.append(deepcopy(data))
        return results

    # ------------------------------------------------------------------
    # Sessions
    # ------------------------------------------------------------------

    async def create_session(self, session_id: Optional[UUID] = None) -> UUID:
        sid = session_id or uuid4()
        async with self._lock:
            self._sessions[str(sid)] = {
                "session_id": str(sid),
                "created_at": _now_iso(),
                "status": "created",
                "paper_ids": [],
            }
        return sid

    async def update_session(self, session_id: UUID, updates: Dict[str, Any]) -> None:
        async with self._lock:
            sid = str(session_id)
            if sid in self._sessions:
                self._sessions[sid].update(updates)

    async def get_session(self, session_id: UUID) -> Optional[Dict[str, Any]]:
        async with self._lock:
            data = self._sessions.get(str(session_id))
            return deepcopy(data) if data else None

    # ------------------------------------------------------------------
    # Reports
    # ------------------------------------------------------------------

    async def save_report(self, report_id: UUID, report: Dict[str, Any]) -> None:
        async with self._lock:
            self._reports[str(report_id)] = deepcopy(report)

    async def get_report(self, report_id: UUID) -> Optional[Dict[str, Any]]:
        async with self._lock:
            data = self._reports.get(str(report_id))
            return deepcopy(data) if data else None

    async def list_reports(
        self,
        session_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            all_reports = list(self._reports.values())
        if session_id:
            sid = str(session_id)
            all_reports = [r for r in all_reports if str(r.get("session_id", "")) == sid]
        return [deepcopy(r) for r in all_reports[skip : skip + limit]]

    async def update_report(self, report_id: UUID, updates: Dict[str, Any]) -> None:
        async with self._lock:
            rid = str(report_id)
            if rid in self._reports:
                self._reports[rid].update(updates)


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------

store = InMemoryStore()

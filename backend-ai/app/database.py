"""Database layer for Supabase integration."""

from __future__ import annotations

import os
from typing import List, Optional, Dict, Any
from uuid import UUID

from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

from app.models.paper import Paper, Chunk, Analysis, Report, Claim
from app.config import settings


class DatabaseService:
    """Service for interacting with Supabase database."""

    def __init__(self):
        """Initialize the Supabase client."""
        self.supabase_url = settings.supabase_url
        self.supabase_key = settings.supabase_key

        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "Supabase URL and key must be configured in environment variables"
            )

        # Initialize Supabase client
        options = ClientOptions()
        options.schema = "public"
        self.supabase: Client = create_client(
            self.supabase_url,
            self.supabase_key,
            options
        )

    # Paper operations
    async def create_paper(self, paper: Paper) -> Paper:
        """Create a new paper record."""
        try:
            data = paper.model_dump(exclude={'paper_id'})  # Let DB generate ID
            result = self.supabase.table('papers').insert(data).execute()

            if result.data:
                paper.paper_id = UUID(result.data[0]['id'])
                return paper
            else:
                raise Exception("Failed to create paper")
        except Exception as e:
            raise Exception(f"Database error creating paper: {str(e)}")

    async def get_paper(self, paper_id: UUID) -> Optional[Paper]:
        """Get a paper by ID."""
        try:
            result = self.supabase.table('papers').select('*').eq('id', str(paper_id)).execute()

            if result.data:
                return Paper(**result.data[0])
            return None
        except Exception as e:
            raise Exception(f"Database error getting paper: {str(e)}")

    async def list_papers(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Paper]:
        """List papers with optional filtering."""
        try:
            query = self.supabase.table('papers').select('*')

            if status:
                query = query.eq('processing_status', status)

            result = query.range(skip, skip + limit - 1).execute()

            return [Paper(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Database error listing papers: {str(e)}")

    async def update_paper(self, paper: Paper) -> Paper:
        """Update an existing paper record."""
        try:
            data = paper.model_dump(exclude={'paper_id'})
            result = self.supabase.table('papers').update(data).eq('id', str(paper.paper_id)).execute()

            if result.data:
                return paper
            else:
                raise Exception("Failed to update paper")
        except Exception as e:
            raise Exception(f"Database error updating paper: {str(e)}")

    # Chunk operations
    async def create_chunk(self, chunk: Chunk) -> Chunk:
        """Create a new chunk record."""
        try:
            data = chunk.model_dump(exclude={'chunk_id'})  # Let DB generate ID
            result = self.supabase.table('chunks').insert(data).execute()

            if result.data:
                chunk.chunk_id = UUID(result.data[0]['id'])
                return chunk
            else:
                raise Exception("Failed to create chunk")
        except Exception as e:
            raise Exception(f"Database error creating chunk: {str(e)}")

    async def create_chunks_batch(self, chunks: List[Chunk]) -> List[Chunk]:
        """Create multiple chunk records in batch."""
        try:
            data = [chunk.model_dump(exclude={'chunk_id'}) for chunk in chunks]
            result = self.supabase.table('chunks').insert(data).execute()

            if result.data:
                for i, chunk in enumerate(chunks):
                    chunk.chunk_id = UUID(result.data[i]['id'])
                return chunks
            else:
                raise Exception("Failed to create chunks batch")
        except Exception as e:
            raise Exception(f"Database error creating chunks batch: {str(e)}")

    async def get_chunks_by_paper(
        self,
        paper_id: UUID,
        skip: int = 0,
        limit: int = 100,
        section: Optional[str] = None
    ) -> List[Chunk]:
        """Get chunks for a specific paper."""
        try:
            query = self.supabase.table('chunks').select('*').eq('paper_id', str(paper_id))

            if section:
                query = query.eq('section', section)

            result = query.range(skip, skip + limit - 1).execute()

            return [Chunk(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Database error getting chunks by paper: {str(e)}")

    async def get_chunk(self, chunk_id: UUID) -> Optional[Chunk]:
        """Get a chunk by ID."""
        try:
            result = self.supabase.table('chunks').select('*').eq('id', str(chunk_id)).execute()

            if result.data:
                return Chunk(**result.data[0])
            return None
        except Exception as e:
            raise Exception(f"Database error getting chunk: {str(e)}")

    # Analysis operations
    async def create_analysis(self, analysis: Analysis) -> Analysis:
        """Create a new analysis record."""
        try:
            data = analysis.model_dump(exclude={'analysis_id'})  # Let DB generate ID
            result = self.supabase.table('analyses').insert(data).execute()

            if result.data:
                analysis.analysis_id = UUID(result.data[0]['id'])
                return analysis
            else:
                raise Exception("Failed to create analysis")
        except Exception as e:
            raise Exception(f"Database error creating analysis: {str(e)}")

    async def get_analysis_by_paper(self, paper_id: UUID) -> Optional[Analysis]:
        """Get analysis for a specific paper."""
        try:
            result = self.supabase.table('analyses').select('*').eq('paper_id', str(paper_id)).execute()

            if result.data:
                return Analysis(**result.data[0])
            return None
        except Exception as e:
            raise Exception(f"Database error getting analysis by paper: {str(e)}")

    # Report operations
    async def create_report(self, report: Report) -> Report:
        """Create a new report record."""
        try:
            data = report.model_dump(exclude={'report_id'})  # Let DB generate ID
            result = self.supabase.table('reports').insert(data).execute()

            if result.data:
                report.report_id = UUID(result.data[0]['id'])
                return report
            else:
                raise Exception("Failed to create report")
        except Exception as e:
            raise Exception(f"Database error creating report: {str(e)}")

    async def get_report(self, report_id: UUID) -> Optional[Report]:
        """Get a report by ID."""
        try:
            result = self.supabase.table('reports').select('*').eq('id', str(report_id)).execute()

            if result.data:
                return Report(**result.data[0])
            return None
        except Exception as e:
            raise Exception(f"Database error getting report: {str(e)}")

    async def list_reports(
        self,
        skip: int = 0,
        limit: int = 100,
        session_id: Optional[UUID] = None
    ) -> List[Report]:
        """List reports with optional filtering."""
        try:
            query = self.supabase.table('reports').select('*')

            if session_id:
                query = query.eq('session_id', str(session_id))

            result = query.range(skip, skip + limit - 1).execute()

            return [Report(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Database error listing reports: {str(e)}")

    # Claim operations
    async def create_claim(self, claim: Claim) -> Claim:
        """Create a new claim record."""
        try:
            data = claim.model_dump(exclude={'claim_id'})  # Let DB generate ID
            result = self.supabase.table('claims').insert(data).execute()

            if result.data:
                claim.claim_id = UUID(result.data[0]['id'])
                return claim
            else:
                raise Exception("Failed to create claim")
        except Exception as e:
            raise Exception(f"Database error creating claim: {str(e)}")

    async def get_claims_by_report(self, report_id: UUID) -> List[Claim]:
        """Get claims associated with a report."""
        try:
            # This would require a claims_reports junction table in a real implementation
            # For now, we'll return an empty list as this is a simplified implementation
            return []
        except Exception as e:
            raise Exception(f"Database error getting claims by report: {str(e)}")

    # Health check
    async def health_check(self) -> bool:
        """Check if the database connection is healthy."""
        try:
            # Simple query to test connection
            result = self.supabase.table('papers').select('count').limit(1).execute()
            return True
        except Exception:
            return False


# Global database instance
db_service = DatabaseService()
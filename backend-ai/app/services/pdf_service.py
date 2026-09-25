"""Service for extracting text and metadata from PDF files."""

from __future__ import annotations

import io
import logging
from typing import List, Dict, Any, Optional
from uuid import UUID

import pypdf
from pypdf import PdfReader

from app.models.paper import Paper
from app.config import settings

logger = logging.getLogger(__name__)


class PDFService:
    """Service for extracting text and metadata from PDF files."""

    def __init__(self):
        """Initialize the PDF service."""
        pass

    def extract_text(self, file_path: str) -> Dict[str, Any]:
        """Synchronously extract text and metadata from a file path."""
        try:
            with open(file_path, "rb") as fh:
                content = fh.read()
            pdf_file = io.BytesIO(content)
            pdf_reader = PdfReader(pdf_file)
            num_pages = len(pdf_reader.pages)
            full_text = ""
            for page in pdf_reader.pages:
                try:
                    full_text += (page.extract_text() or "") + "\n\n"
                except Exception:
                    continue
            meta = pdf_reader.metadata or {}
            title = meta.get("/Title", "") or ""
            authors = meta.get("/Author", "") or ""
            return {
                "text": full_text.strip(),
                "full_text": full_text.strip(),
                "num_pages": num_pages,
                "metadata": {
                    "title": str(title).strip() if title else "",
                    "authors": str(authors).strip() if authors else "",
                    "total_pages": num_pages,
                },
                "abstract": "",
            }
        except Exception as exc:
            logger.error("PDF extract_text failed for %s: %s", file_path, exc)
            return {"text": "", "full_text": "", "num_pages": 0, "metadata": {}, "abstract": ""}

    async def extract_text_and_metadata(
        self,
        file_content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Extract text content and metadata from a PDF file.

        Args:
            file_content: The PDF file content as bytes
            filename: The original filename

        Returns:
            Dict containing extracted text, metadata, and structural information
        """
        try:
            # Create a PDF reader object
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PdfReader(pdf_file)

            # Extract basic metadata
            metadata = pdf_reader.metadata
            num_pages = len(pdf_reader.pages)

            # Extract text from each page
            pages_text = []
            full_text = ""

            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    pages_text.append({
                        "page_number": page_num + 1,
                        "text": page_text,
                        "char_count": len(page_text)
                    })
                    full_text += page_text + "\n\n"
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {page_num + 1}: {str(e)}")
                    pages_text.append({
                        "page_number": page_num + 1,
                        "text": "",
                        "char_count": 0,
                        "error": str(e)
                    })

            # Try to extract title, authors, and year from metadata
            title = ""
            authors = ""
            year = ""

            if metadata:
                title = metadata.get("/Title", "") or ""
                authors = metadata.get("/Author", "") or ""
                # Try to extract year from creation date or title
                creation_date = metadata.get("/CreationDate", "")
                if creation_date:
                    # PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
                    try:
                        year_str = creation_date[2:6]  # Extract YYYY
                        if year_str.isdigit():
                            year = year_str
                    except:
                        pass

                # If no year in creation date, try to extract from title
                if not year:
                    import re
                    year_match = re.search(r'\b(19|20)\d{2}\b', title)
                    if year_match:
                        year = year_match.group()

            # Clean up extracted metadata
            title = title.strip()
            authors = authors.strip()
            year = year.strip()

            # Detect document structure (sections)
            sections = self._detect_sections(full_text)

            return {
                "filename": filename,
                "num_pages": num_pages,
                "full_text": full_text.strip(),
                "pages_text": pages_text,
                "metadata": {
                    "title": title,
                    "authors": authors,
                    "year": year,
                    "subject": metadata.get("/Subject", "") if metadata else "",
                    "creator": metadata.get("/Creator", "") if metadata else "",
                    "producer": metadata.get("/Producer", "") if metadata else "",
                    "creation_date": metadata.get("/CreationDate", "") if metadata else "",
                    "modification_date": metadata.get("/ModDate", "") if metadata else ""
                },
                "sections": sections,
                "success": True
            }

        except Exception as e:
            logger.error(f"Failed to extract text from PDF {filename}: {str(e)}")
            return {
                "filename": filename,
                "num_pages": 0,
                "full_text": "",
                "pages_text": [],
                "metadata": {},
                "sections": [],
                "success": False,
                "error": str(e)
            }

    def _detect_sections(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect common sections in academic papers.

        Args:
            text: The full text of the paper

        Returns:
            List of detected sections with their positions
        """
        sections = []

        # Common section headers in academic papers
        section_patterns = [
            r'(?i)^\s*abstract\s*$',
            r'(?i)^\s*introduction\s*$',
            r'(?i)^\s*background\s*$',
            r'(?i)^\s*related\s+work\s*$',
            r'(?i)^\s*methodology\s*$',
            r'(?i)^\s*methods\s*$',
            r'(?i)^\s*experimental\s+setup\s*$',
            r'(?i)^\s*results\s*$',
            r'(?i)^\s*discussion\s*$',
            r'(?i)^\s*conclusion\s*$',
            r'(?i)^\s*limitations\s*$',
            r'(?i)^\s*references\s*$',
            r'(?i)^\s*acknowledgments\s*$',
            r'(?i)^\s*appendix\s*$'
        ]

        lines = text.split('\n')
        current_pos = 0

        for line_num, line in enumerate(lines):
            line_stripped = line.strip()
            if not line_stripped:
                current_pos += len(line) + 1  # +1 for newline
                continue

            # Check if line matches any section pattern
            for pattern in section_patterns:
                import re
                if re.match(pattern, line_stripped):
                    section_name = line_stripped.lower().strip()
                    sections.append({
                        "section": section_name,
                        "line_number": line_num + 1,
                        "position": current_pos,
                        "text_preview": line_stripped[:100]
                    })
                    break

            current_pos += len(line) + 1  # +1 for newline

        return sections

    async def extract_text_by_sections(
        self,
        file_content: bytes,
        filename: str
    ) -> List[Dict[str, Any]]:
        """
        Extract text organized by sections.

        Args:
            file_content: The PDF file content as bytes
            filename: The original filename

        Returns:
            List of sections with their text content
        """
        # First extract full text and metadata
        extraction_result = await self.extract_text_and_metadata(file_content, filename)

        if not extraction_result["success"]:
            return []

        full_text = extraction_result["full_text"]
        detected_sections = extraction_result["sections"]

        # If we detected sections, try to split text by sections
        if detected_sections:
            return await self._split_text_by_sections(full_text, detected_sections)
        else:
            # Fallback: treat entire document as one section
            return [{
                "section": "full_document",
                "text": full_text,
                "page_range": [1, extraction_result["num_pages"]],
                "word_count": len(full_text.split())
            }]

    async def _split_text_by_sections(
        self,
        text: str,
        detected_sections: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Split text content by detected sections.

        Args:
            text: The full text to split
            detected_sections: List of detected section headers

        Returns:
            List of sections with their content
        """
        sections_with_content = []

        # Sort sections by position
        sorted_sections = sorted(detected_sections, key=lambda x: x["position"])

        for i, section_info in enumerate(sorted_sections):
            start_pos = section_info["position"]

            # Determine end position (next section or end of text)
            if i + 1 < len(sorted_sections):
                end_pos = sorted_sections[i + 1]["position"]
            else:
                end_pos = len(text)

            # Extract section content
            section_text = text[start_pos:end_pos].strip()

            # Try to estimate page range (simplified)
            # In a real implementation, we'd map character positions to page numbers
            estimated_start_page = max(1, (start_pos // len(text)) * len(text) // 1000 + 1)
            estimated_end_page = max(estimated_start_page, ((end_pos // len(text)) * len(text) // 1000 + 1))

            sections_with_content.append({
                "section": section_info["section"],
                "text": section_text,
                "page_range": [estimated_start_page, estimated_end_page],
                "word_count": len(section_text.split()),
                "char_count": len(section_text)
            })

        return sections_with_content
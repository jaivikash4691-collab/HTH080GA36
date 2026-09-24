"""Robust LLM output parser for handling unreliable LLM outputs."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional


class LLMParseError(Exception):
    """Exception raised when LLM output cannot be parsed."""

    def __init__(self, raw_text: str, message: str = "Failed to parse LLM output"):
        self.raw_text = raw_text
        self.message = message
        super().__init__(f"{message}: {raw_text[:200]}...")


class LLMOutputParser:
    """Robust parser for LLM JSON outputs."""

    @staticmethod
    def parse_json(raw: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM output with robust error handling.

        Args:
            raw: Raw LLM output string

        Returns:
            Parsed JSON as dictionary

        Raises:
            LLMParseError: If JSON cannot be parsed after all recovery attempts
        """
        if not raw or not isinstance(raw, str):
            raise LLMParseError(raw, "Input is not a valid string")

        # Step 1: Strip leading/trailing whitespace
        text = raw.strip()

        # Step 2: Remove markdown code fences
        # Handle ```json ... ``` or ``` ... ```
        if text.startswith("```json"):
            text = text[7:]  # Remove ```json
        elif text.startswith("```"):
            text = text[3:]  # Remove ```

        if text.endswith("```"):
            text = text[:-3]  # Remove trailing ```

        text = text.strip()

        # Step 3: Find the first { and last }
        start_idx = text.find("{")
        end_idx = text.rfind("}")

        if start_idx == -1 or end_idx == -1 or start_idx >= end_idx:
            raise LLMParseError(raw, "No valid JSON object found")

        # Step 4: Extract only that substring
        json_str = text[start_idx:end_idx + 1]

        # Step 5: Try json.loads()
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass  # Will try to fix below

        # Step 6: Try to fix common issues
        fixed_str = LLMOutputParser._fix_common_json_issues(json_str)

        try:
            return json.loads(fixed_str)
        except json.JSONDecodeError as e:
            raise LLMParseError(raw, f"JSON parsing failed after fixes: {str(e)}")

    @staticmethod
    def _fix_common_json_issues(json_str: str) -> str:
        """Fix common JSON issues in LLM output."""
        # Fix trailing commas before } or ]
        json_str = re.sub(r',\s*([}\]])', r'\1', json_str)

        # Fix single quotes (but be careful with contractions)
        # Simple approach: replace ' with " only when it's a JSON string delimiter
        # This is a simplified fix - in practice, you might want a more sophisticated approach
        # For now, we'll handle the most common cases

        # Fix unescaped newlines in strings by replacing them with \n
        # We need to be careful to only do this inside strings
        # A simple approach: replace actual newlines with \n, but this can break valid JSON
        # Instead, we'll try to parse and if it fails due to newlines, we'll fix

        # Try to fix missing closing braces by counting
        open_braces = json_str.count('{')
        close_braces = json_str.count('}')
        open_brackets = json_str.count('[')
        close_brackets = json_str.count(']')

        # Add missing closing braces/brackets
        while close_braces < open_braces:
            json_str += '}'
            close_braces += 1

        while close_brackets < open_brackets:
            json_str += ']'
            close_brackets += 1

        return json_str.strip()

    @staticmethod
    def extract_paper_analysis(raw: str) -> Dict[str, Any]:
        """
        Parse paper analysis JSON with validation and defaults.

        Args:
            raw: Raw LLM output string

        Returns:
            Validated and cleaned paper analysis dictionary
        """
        parsed = LLMOutputParser.parse_json(raw)

        # Define required keys and their defaults
        required_fields = {
            "objective": "Not reported",
            "research_problem": "Not reported",
            "key_concepts": [],
            "methodology": {},
            "key_findings": [],
            "advantages": [],
            "disadvantages": [],
            "limitations": [],
            "conclusion": "Not reported",
            "experimental_setup": "Not reported",
            "performance_results": "Not reported",
            "domain": "Not reported"
        }

        # Fill missing keys with defaults
        for key, default_value in required_fields.items():
            if key not in parsed:
                parsed[key] = default_value

        # Ensure methodology has required sub-fields
        if isinstance(parsed.get("methodology"), dict):
            methodology_defaults = {
                "approach": "Not reported",
                "algorithm_or_model": "Not reported",
                "dataset": "Not reported",
                "dataset_size": "Not reported",
                "evaluation_metrics": [],
                "baselines": [],
                "hardware": "Not reported",
                "reproducibility": "Not reported"
            }
            for key, default_value in methodology_defaults.items():
                if key not in parsed["methodology"]:
                    parsed["methodology"][key] = default_value
        else:
            parsed["methodology"] = {
                "approach": "Not reported",
                "algorithm_or_model": "Not reported",
                "dataset": "Not reported",
                "dataset_size": "Not reported",
                "evaluation_metrics": [],
                "baselines": [],
                "hardware": "Not reported",
                "reproducibility": "Not reported"
            }

        # Validate every finding has a label field
        if isinstance(parsed.get("key_findings"), list):
            for finding in parsed["key_findings"]:
                if isinstance(finding, dict) and "label" not in finding:
                    finding["label"] = "AI_INFERRED"
                elif not isinstance(finding, dict):
                    # Convert non-dict findings to proper format
                    # This is a fallback - ideally LLM should return dicts
                    pass

        # Apply same label validation to advantages, disadvantages, limitations
        for field in ["advantages", "disadvantages", "limitations"]:
            if isinstance(parsed.get(field), list):
                for item in parsed[field]:
                    if isinstance(item, dict) and "label" not in item:
                        item["label"] = "AI_INFERRED"

        return parsed

    @staticmethod
    def extract_common_findings(raw: str) -> List[Dict[str, Any]]:
        """
        Parse common findings JSON with validation.

        Args:
            raw: Raw LLM output string

        Returns:
            List of validated common findings
        """
        parsed = LLMOutputParser.parse_json(raw)

        # Extract common_findings array
        common_findings = parsed.get("common_findings", [])
        if not isinstance(common_findings, list):
            common_findings = []

        # Validate each finding
        validated_findings = []
        for finding in common_findings:
            if not isinstance(finding, dict):
                continue

            # Check required fields
            if not all(key in finding for key in ["finding", "supporting_papers", "strength", "confidence"]):
                continue

            # Filter out findings with fewer than 2 supporting papers
            supporting_papers = finding.get("supporting_papers", [])
            if not isinstance(supporting_papers, list) or len(supporting_papers) < 2:
                continue

            # Validate strength
            strength = finding.get("strength", "")
            if strength not in ["STRONG (3+ papers)", "MODERATE (2 papers)"]:
                # Try to fix or default
                if "3" in str(supporting_papers) or len(supporting_papers) >= 3:
                    finding["strength"] = "STRONG (3+ papers)"
                else:
                    finding["strength"] = "MODERATE (2 papers)"

            # Validate confidence
            confidence = finding.get("confidence", "")
            if confidence not in ["HIGH", "MEDIUM", "LOW"]:
                finding["confidence"] = "MEDIUM"  # Default

            validated_findings.append(finding)

        return validated_findings

    @staticmethod
    def extract_contradictions(raw: str) -> List[Dict[str, Any]]:
        """
        Parse contradictions JSON with validation.

        Args:
            raw: Raw LLM output string

        Returns:
            List of validated contradictions
        """
        parsed = LLMOutputParser.parse_json(raw)

        # Extract contradictions array
        contradictions = parsed.get("contradictions", [])
        if not isinstance(contradictions, list):
            contradictions = []

        # Validate each contradiction
        validated_contradictions = []
        valid_types = ["CONTRADICTION", "CONTEXTUAL_DIFFERENCE"]

        for contradiction in contradictions:
            if not isinstance(contradiction, dict):
                continue

            # Check required fields
            required_fields = ["type", "topic", "paper_a", "paper_b", "possible_reasons"]
            if not all(key in contradiction for key in required_fields):
                continue

            # Validate type
            if contradiction.get("type") not in valid_types:
                contradiction["type"] = "CONTEXTUAL_DIFFERENCE"  # Default safe value

            # Validate paper_a and paper_b structure
            for paper_key in ["paper_a", "paper_b"]:
                paper = contradiction.get(paper_key, {})
                if not isinstance(paper, dict):
                    contradiction[paper_key] = {
                        "paper_id": "unknown",
                        "paper_title": "Unknown Paper",
                        "claim": "Not reported",
                        "evidence": "Not reported",
                        "section": "Not reported",
                        "page": None
                    }
                else:
                    # Ensure required sub-fields
                    paper_defaults = {
                        "paper_id": "unknown",
                        "paper_title": "Unknown Paper",
                        "claim": "Not reported",
                        "evidence": "Not reported",
                        "section": "Not reported",
                        "page": None
                    }
                    for key, default_value in paper_defaults.items():
                        if key not in paper:
                            paper[key] = default_value
                    contradiction[paper_key] = paper

            # Ensure possible_reasons is a list
            if not isinstance(contradiction.get("possible_reasons"), list):
                contradiction["possible_reasons"] = ["Reason not specified"]

            # Ensure resolution is a string
            if "resolution" not in contradiction or not isinstance(contradiction["resolution"], str):
                contradiction["resolution"] = "Further research needed to resolve this disagreement."

            validated_contradictions.append(contradiction)

        return validated_contradictions

    @staticmethod
    def extract_research_gaps(raw: str) -> List[Dict[str, Any]]:
        """
        Parse research gaps JSON with validation.

        Args:
            raw: Raw LLM output string

        Returns:
            List of validated research gaps
        """
        parsed = LLMOutputParser.parse_json(raw)

        # Extract research_gaps array
        research_gaps = parsed.get("research_gaps", [])
        if not isinstance(research_gaps, list):
            research_gaps = []

        # Validate each gap
        validated_gaps = []
        valid_gap_types = [
            "MISSING_DATASET", "MISSING_EXPERIMENT", "UNRESOLVED_CONTRADICTION",
            "UNEXPLORED_COMBINATION", "MISSING_EVALUATION", "SCALABILITY_UNKNOWN",
            "REPRODUCIBILITY_UNKNOWN", "DOMAIN_LIMITATION"
        ]

        for gap in research_gaps:
            if not isinstance(gap, dict):
                continue

            # Check required fields
            if not all(key in gap for key in ["gap", "why_it_matters", "evidence_from_papers", "gap_type"]):
                continue

            # Validate evidence_from_papers is a list
            evidence_from_papers = gap.get("evidence_from_papers", [])
            if not isinstance(evidence_from_papers, list):
                gap["evidence_from_papers"] = []
            else:
                # Validate each evidence item
                valid_evidence = []
                for evidence in evidence_from_papers:
                    if isinstance(evidence, dict) and \
                       "paper_id" in evidence and "paper_title" in evidence and "evidence" in evidence:
                        valid_evidence.append(evidence)
                gap["evidence_from_papers"] = valid_evidence

            # Validate gap_type
            gap_type = gap.get("gap_type", "")
            if gap_type not in valid_gap_types:
                gap["gap_type"] = "MISSING_EXPERIMENT"  # Default reasonable value

            validated_gaps.append(gap)

        return validated_gaps

    @staticmethod
    def extract_qa_answer(raw: str) -> Dict[str, Any]:
        """
        Parse Q&A answer JSON with validation.

        Args:
            raw: Raw LLM output string

        Returns:
            Validated Q&A answer dictionary
        """
        parsed = LLMOutputParser.parse_json(raw)

        # Ensure required fields exist with defaults
        if "answer" not in parsed or not isinstance(parsed["answer"], str):
            parsed["answer"] = "Insufficient evidence in the uploaded documents to answer this question."

        if "citations" not in parsed or not isinstance(parsed["citations"], list):
            parsed["citations"] = []

        # Validate each citation
        valid_citations = []
        for citation in parsed["citations"]:
            if isinstance(citation, dict):
                # Ensure citation has required fields
                citation.setdefault("paper_title", "Unknown Paper")
                citation.setdefault("section", "Not reported")
                citation.setdefault("page", None)
                citation.setdefault("chunk_id", "unknown")
                citation.setdefault("passage", "")
                valid_citations.append(citation)
        parsed["citations"] = valid_citations

        # Infer answer_type if missing
        if "answer_type" not in parsed or not isinstance(parsed["answer_type"], str):
            answer_text = parsed["answer"].lower()
            if "insufficient evidence" in answer_text:
                parsed["answer_type"] = "INSUFFICIENT_EVIDENCE"
            else:
                parsed["answer_type"] = "DIRECT"

        # Validate answer_type
        valid_answer_types = ["DIRECT", "PARTIAL", "INSUFFICIENT_EVIDENCE"]
        if parsed.get("answer_type") not in valid_answer_types:
            parsed["answer_type"] = "DIRECT"  # Default

        # Validate confidence
        if "confidence" not in parsed or not isinstance(parsed["confidence"], str):
            parsed["confidence"] = "LOW"

        valid_confidence = ["HIGH", "MEDIUM", "LOW"]
        if parsed.get("confidence") not in valid_confidence:
            parsed["confidence"] = "LOW"  # Default

        # Validate papers_referenced
        if "papers_referenced" not in parsed or not isinstance(parsed["papers_referenced"], list):
            parsed["papers_referenced"] = []
        else:
            # Ensure all items are strings
            parsed["papers_referenced"] = [
                str(p) for p in parsed["papers_referenced"] if isinstance(p, (str, int, float))
            ]

        # Validate synthesis_note
        if "synthesis_note" not in parsed:
            parsed["synthesis_note"] = None
        elif parsed["synthesis_note"] is not None and not isinstance(parsed["synthesis_note"], str):
            parsed["synthesis_note"] = str(parsed["synthesis_note"])

        return parsed

    @staticmethod
    def extract_claim_verification(raw: str) -> Dict[str, Any]:
        """
        Parse claim verification JSON with validation.

        Args:
            raw: Raw LLM output string

        Returns:
            Validated claim verification dictionary
        """
        parsed = LLMOutputParser.parse_json(raw)

        # Validate required fields
        if "status" not in parsed or not isinstance(parsed["status"], str):
            parsed["status"] = "UNSUPPORTED"

        valid_statuses = ["SUPPORTED", "PARTIALLY_SUPPORTED", "UNSUPPORTED", "CONTRADICTED"]
        if parsed["status"] not in valid_statuses:
            parsed["status"] = "UNSUPPORTED"

        # Validate confidence
        if "confidence" not in parsed:
            parsed["confidence"] = 0.0

        try:
            confidence = float(parsed["confidence"])
            # Clamp to 0-1 range
            parsed["confidence"] = max(0.0, min(1.0, confidence))
        except (ValueError, TypeError):
            parsed["confidence"] = 0.0

        # Validate explanation
        if "explanation" not in parsed or not isinstance(parsed["explanation"], str):
            parsed["explanation"] = "Verification completed based on available evidence."

        # Ensure supporting_passage is string or null
        if "supporting_passage" not in parsed:
            parsed["supporting_passage"] = None
        elif parsed["supporting_passage"] is not None and not isinstance(parsed["supporting_passage"], str):
            parsed["supporting_passage"] = str(parsed["supporting_passage"])

        # Ensure supporting_chunk_id is string or null (will be converted to UUID elsewhere if needed)
        if "supporting_chunk_id" not in parsed:
            parsed["supporting_chunk_id"] = None
        elif parsed["supporting_chunk_id"] is not None and not isinstance(parsed["supporting_chunk_id"], str):
            parsed["supporting_chunk_id"] = str(parsed["supporting_chunk_id"])

        # Ensure suggested_correction is string or null
        if "suggested_correction" not in parsed:
            parsed["suggested_correction"] = None
        elif parsed["suggested_correction"] is not None and not isinstance(parsed["suggested_correction"], str):
            parsed["suggested_correction"] = str(parsed["suggested_correction"])

        return parsed


class SectionExtractor:
    """Utility for extracting section-level text from paper analysis."""

    @staticmethod
    def group_chunks_by_section(chunks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group chunks by their section_type field.

        Args:
            chunks: List of chunk dictionaries

        Returns:
            Dictionary mapping section_type to list of chunks
        """
        grouped: Dict[str, List[Dict[str, Any]]] = {}

        for chunk in chunks:
            if not isinstance(chunk, dict):
                continue

            section = chunk.get("section_type", chunk.get("section", "Not reported"))
            if not isinstance(section, str):
                section = "Not reported"

            if section not in grouped:
                grouped[section] = []
            grouped[section].append(chunk)

        return grouped

    @staticmethod
    def get_section_text(chunks_by_section: Dict[str, List[Dict[str, Any]]], section: str) -> str:
        """
        Return concatenated text for a section.

        Args:
            chunks_by_section: Dictionary mapping section_type to chunks
            section: Section name to extract text for

        Returns:
            Concatenated text for the section (max 3000 characters)
        """
        if section not in chunks_by_section:
            return ""

        chunks = chunks_by_section[section]
        if not chunks:
            return ""

        # Sort chunks by page number for consistent ordering
        def get_page_number(chunk):
            if not isinstance(chunk, dict):
                return 0
            page = chunk.get("page_number", chunk.get("page", 0))
            try:
                return int(page) if page is not None else 0
            except (ValueError, TypeError):
                return 0

        sorted_chunks = sorted(chunks, key=get_page_number)

        # Concatenate text with page numbers
        text_parts = []
        current_length = 0
        max_length = 3000

        for chunk in sorted_chunks:
            if not isinstance(chunk, dict):
                continue

            content = chunk.get("content", "")
            if not isinstance(content, str):
                content = str(content)

            page_num = chunk.get("page_number", chunk.get("page"))
            page_str = f"[p.{page_num}]" if page_num is not None else ""

            # Format: [p.N] content
            chunk_text = f"{page_str} {content}".strip()

            # Check if adding this chunk would exceed limit
            if current_length + len(chunk_text) + 1 > max_length:  # +1 for newline
                # Add partial chunk if we have space for at least some content
                remaining_space = max_length - current_length
                if remaining_space > 50:  # Only add if we have meaningful space
                    # Try to add a partial chunk
                    available_text = chunk_text[:remaining_space-3] + "..."
                    text_parts.append(available_text)
                break

            text_parts.append(chunk_text)
            current_length += len(chunk_text) + 1  # +1 for newline

        return "\n".join(text_parts)

    @staticmethod
    def build_paper_context(chunks: List[Dict[str, Any]], max_chars: int = 8000) -> str:
        """
        Build a formatted evidence string from chunks.

        Args:
            chunks: List of chunk dictionaries
            max_chars: Maximum characters to return

        Returns:
            Formatted evidence string
        """
        if not chunks:
            return ""

        # Sort chunks by page number first
        def get_page_number(chunk):
            if not isinstance(chunk, dict):
                return 0
            page = chunk.get("page_number", chunk.get("page", 0))
            try:
                return int(page) if page is not None else 0
            except (ValueError, TypeError):
                return 0

        sorted_chunks = sorted(chunks, key=get_page_number)

        # Format each chunk
        formatted_parts = []
        current_length = 0

        for chunk in sorted_chunks:
            if not isinstance(chunk, dict):
                continue

            section = chunk.get("section", chunk.get("section_type", "Not reported"))
            page = chunk.get("page_number", chunk.get("page"))
            content = chunk.get("content", "")

            if not isinstance(content, str):
                content = str(content)

            page_str = str(page) if page is not None else "Not reported"
            formatted_chunk = f"[Section: {section} | Page: {page_str}]\n{content}"

            # Add separator except for last chunk
            separator = "\n---\n" if chunk != sorted_chunks[-1] else ""
            chunk_to_add = formatted_chunk + separator

            # Check if adding this chunk would exceed limit
            if current_length + len(chunk_to_add) > max_chars:
                # Try to add partial content if we have significant space left
                remaining_space = max_chars - current_length
                if remaining_space > 100:  # Only if we have reasonable space
                    # Truncate the formatted chunk to fit
                    available_space = remaining_space - len(separator) - 3  # -3 for "..."
                    if available_space > 50:
                        truncated_content = content[:available_space] + "..."
                        truncated_chunk = f"[Section: {section} | Page: {page_str}]\n{truncated_content}"
                        if chunk != sorted_chunks[-1]:
                            truncated_chunk += separator
                        formatted_parts.append(truncated_chunk)
                break

            formatted_parts.append(chunk_to_add)
            current_length += len(chunk_to_add)

        return "".join(formatted_parts)

    @staticmethod
    def prioritize_chunks(chunks: List[Dict[str, Any]], question: str) -> List[Dict[str, Any]]:
        """
        Prioritize chunks based on question relevance.

        Args:
            chunks: List of chunk dictionaries
            question: Question to prioritize for

        Returns:
            Prioritized list of chunks (top 10)
        """
        if not chunks:
            return []

        # Extract keywords from question (simple approach)
        question_lower = question.lower()
        # Remove common stop words and extract meaningful terms
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
                     "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
                     "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
                     "what", "when", "where", "why", "how", "who", "which"}

        # Simple word extraction (alphanumeric only)
        words = re.findall(r'\b[a-zA-Z]+\b', question_lower)
        keywords = [word for word in words if word not in stop_words and len(word) > 2]

        # Score each chunk
        scored_chunks = []
        for chunk in chunks:
            if not isinstance(chunk, dict):
                scored_chunks.append((0, chunk))  # Low score for non-dict
                continue

            score = 0

            # 1. Chunks from sections matching question keywords
            section = chunk.get("section", chunk.get("section_type", "")).lower()
            content = chunk.get("content", "").lower()

            # Check for keyword matches in section and content
            section_matches = sum(1 for keyword in keywords if keyword in section)
            content_matches = sum(1 for keyword in keywords if keyword in content)
            score += (section_matches * 3) + (content_matches * 1)  # Section matches weighted higher

            # 2. Chunks with higher page numbers (often results/conclusion)
            page = chunk.get("page_number", chunk.get("page", 0))
            try:
                page_num = int(page) if page is not None else 0
                # Normalize page score: higher pages get higher scores
                # Assuming typical papers have < 100 pages, we'll use a simple approach
                page_score = min(page_num / 10.0, 10.0)  # Cap at 10 points
                score += page_score
            except (ValueError, TypeError):
                pass  # No page score if invalid

            scored_chunks.append((score, chunk))

        # Sort by score (descending) and return top 10
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [chunk for score, chunk in scored_chunks[:10]]


class CitationFormatter:
    """Utility for formatting citations."""

    @staticmethod
    def format_inline_citation(paper_title: str, section: str, page: Optional[int]) -> str:
        """
        Format an inline citation.

        Args:
            paper_title: Title of the paper
            section: Section name
            page: Page number (can be None)

        Returns:
            Formatted citation string
        """
        if not paper_title or not isinstance(paper_title, str):
            paper_title = "Unknown Paper"

        if not section or not isinstance(section, str):
            section = "Not reported"

        if page is None:
            return f"[{paper_title} | {section}]"
        else:
            return f"[{paper_title} | {section} | Page {page}]"

    @staticmethod
    def format_citation_list(citations: List[Dict[str, Any]]) -> str:
        """
        Format all citations as a numbered list.

        Args:
            citations: List of citation dictionaries

        Returns:
            Formatted citation list string
        """
        if not citations:
            return ""

        formatted_lines = []
        for i, citation in enumerate(citations, 1):
            if not isinstance(citation, dict):
                continue

            paper_title = citation.get("paper_title", "Unknown Paper")
            section = citation.get("section", "Not reported")
            page = citation.get("page")

            if page is None:
                page_str = "Not reported"
            else:
                page_str = str(page)

            formatted_lines.append(f"[{i}] {paper_title} — {section} — Page {page_str}")

        return "\n".join(formatted_lines)

    @staticmethod
    def extract_citations_from_text(text: str) -> List[Dict[str, Any]]:
        """
        Find all inline citations in the format [Paper Title | Section | Page N].

        Args:
            text: Text to search for citations

        Returns:
            List of citation dictionaries with position information
        """
        if not text or not isinstance(text, str):
            return []

        # Regex pattern to match [Paper Title | Section | Page N] or [Paper Title | Section]
        # This pattern captures the components inside the brackets
        pattern = r'\[([^|]+?)\s*\|\s*([^|]+?)(?:\s*\|\s*Page\s*(\d+))?\]'

        citations = []
        for match in re.finditer(pattern, text):
            paper_title = match.group(1).strip()
            section = match.group(2).strip()
            page_str = match.group(3)

            page = None
            if page_str:
                try:
                    page = int(page_str)
                except ValueError:
                    page = None

            citations.append({
                "paper_title": paper_title,
                "section": section,
                "page": page,
                "position": match.start(),
                "full_match": match.group(0)
            })

        return citations

    @staticmethod
    def deduplicate_citations(citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate citations, keeping the one with the most complete information.

        Args:
            citations: List of citation dictionaries

        Returns:
            Deduplicated list of citation dictionaries
        """
        if not citations:
            return []

        # Group citations by their core identity (paper_title, section, page)
        citation_groups: Dict[str, List[Dict[str, Any]]] = {}

        for citation in citations:
            if not isinstance(citation, dict):
                continue

            # Create a key for grouping
            paper_title = citation.get("paper_title", "").strip().lower()
            section = citation.get("section", "").strip().lower()
            page = citation.get("page")

            # Normalize page for grouping (None and "Not reported" treated same)
            page_key = str(page) if page is not None else "none"

            key = f"{paper_title}|{section}|{page_key}"

            if key not in citation_groups:
                citation_groups[key] = []
            citation_groups[key].append(citation)

        # From each group, select the citation with the most complete information
        deduplicated = []
        for group in citation_groups.values():
            if len(group) == 1:
                deduplicated.append(group[0])
            else:
                # Score each citation by completeness
                best_citation = None
                best_score = -1

                for citation in group:
                    score = 0
                    # Prefer non-None values
                    if citation.get("paper_title") and citation["paper_title"] != "Unknown Paper":
                        score += 1
                    if citation.get("section") and citation["section"] != "Not reported":
                        score += 1
                    if citation.get("page") is not None:
                        score += 1
                    if citation.get("passage"):
                        score += 1

                    if score > best_score:
                        best_score = score
                        best_citation = citation

                if best_citation:
                    deduplicated.append(best_citation)

        return deduplicated


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the parser
    print("LLM Parser loaded successfully")
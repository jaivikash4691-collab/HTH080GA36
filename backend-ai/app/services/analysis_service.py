"""Service for analyzing individual research papers."""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .llm_service import LLMService


class PaperAnalysis(BaseModel):
    """Analysis results for a single research paper."""

    objective: str = Field(default="Not reported")
    research_problem: str = Field(default="Not reported")
    key_concepts: List[str] = Field(default_factory=list)
    methodology: Dict[str, Any] = Field(default_factory=dict)
    key_findings: List[Dict[str, Any]] = Field(default_factory=list)
    advantages: List[Dict[str, Any]] = Field(default_factory=list)
    disadvantages: List[Dict[str, Any]] = Field(default_factory=list)
    limitations: List[Dict[str, Any]] = Field(default_factory=list)
    conclusion: str = Field(default="Not reported")
    experimental_setup: str = Field(default="Not reported")
    performance_results: str = Field(default="Not reported")
    domain: str = Field(default="Not reported")


class PaperAnalysisService:
    """Service for analyzing research papers using LLM."""

    def __init__(self) -> None:
        """Initialize the analysis service."""
        try:
            from app.config import get_analysis_model, settings
            from .llm_service import LLMConfig
            cfg = LLMConfig(
                provider=settings.llm_provider,
                model=get_analysis_model(),
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
                timeout=settings.analysis_timeout,
                max_retries=settings.llm_max_retries,
            )
            self.llm_service = LLMService(config=cfg)
        except Exception:
            self.llm_service = LLMService()

        # Initialize Supabase client - assuming environment variables are set
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


        # In a real implementation, you would initialize the Supabase client here
        # For now, we'll note that Supabase integration would happen here

    async def analyze_paper(
        self,
        paper_id: UUID,
        paper_metadata: Dict[str, Any],
        chunks: List[Dict[str, Any]]
    ) -> PaperAnalysis:
        """
        Analyze a single research paper.

        Args:
            paper_id: Unique identifier for the paper
            paper_metadata: Metadata about the paper (title, authors, year)
            chunks: List of retrieved chunks with metadata

        Returns:
            PaperAnalysis: The analysis results
        """
        # Group chunks by section type
        grouped_chunks = self._group_chunks_by_section(chunks)

        # Build structured evidence context string
        formatted_chunks = self.format_chunks_for_prompt(chunks)

        # Prepare paper metadata for the prompt
        title = paper_metadata.get("title", "Not reported")
        authors = paper_metadata.get("authors", "Not reported")
        year = paper_metadata.get("year", "Not reported")

        # Define the exact prompt structure as specified
        system_prompt = """You are a rigorous research analyst.
You must analyze the provided research paper chunks.
You must output ONLY valid JSON.
You must NEVER invent any information not found in the chunks.
You must use "Not reported" for any field not found in the evidence.
You must label every finding as PAPER_REPORTED or AI_INFERRED.
You must include the page number and section for every piece of evidence.
If evidence is insufficient, output "Insufficient evidence"."""

        user_prompt = f"""Analyze this research paper.

Paper Title: {title}
Authors: {authors}
Year: {year}

Evidence chunks from the paper:
{formatted_chunks}

Return a JSON object with this EXACT structure:
{{
  "objective": "string — what the paper aims to do",
  "research_problem": "string — the core problem being solved",
  "key_concepts": ["concept1", "concept2"],
  "methodology": {{
    "approach": "string",
    "algorithm_or_model": "string or Not reported",
    "dataset": "string or Not reported",
    "dataset_size": "string or Not reported",
    "evaluation_metrics": ["metric1", "metric2"],
    "baselines": ["baseline1"] or [],
    "hardware": "string or Not reported",
    "reproducibility": "string or Not reported"
  }},
  "key_findings": [
    {{
      "finding": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{
        "section": "string",
        "page": number or null,
        "passage": "brief quote from the chunk"
      }}
    }}
  ],
  "advantages": [
    {{
      "advantage": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{"section": "string", "page": number or null}}
    }}
  ],
  "disadvantages": [
    {{
      "disadvantage": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{"section": "string", "page": number or null}}
    }}
  ],
  "limitations": [
    {{
      "limitation": "string",
      "label": "PAPER_REPORTED or AI_INFERRED",
      "evidence": {{"section": "string", "page": number or null}}
    }}
  ],
  "conclusion": "string",
  "experimental_setup": "string or Not reported",
  "performance_results": "string or Not reported",
  "domain": "string — detected domain of the paper"
}}"""

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            # We'll define a schema based on the expected output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_analysis_schema()
            )

            # Validate and parse the output
            validated_result = self.validate_analysis_output(raw_result)

            # Create PaperAnalysis instance
            analysis = PaperAnalysis(**validated_result)

            # Store the result in Supabase (placeholder - actual implementation would use Supabase client)
            await self._store_analysis_in_supabase(paper_id, analysis)

            return analysis

        except Exception as e:
            # In case of error, return a default analysis with error info
            print(f"Error analyzing paper {paper_id}: {e}")
            return PaperAnalysis(
                objective="Error during analysis",
                research_problem="Error during analysis",
                key_concepts=[],
                methodology={},
                key_findings=[],
                advantages=[],
                disadvantages=[],
                limitations=[],
                conclusion="Error during analysis",
                experimental_setup="Error during analysis",
                performance_results="Error during analysis",
                domain="Error during analysis"
            )

    async def analyze_all_papers(
        self,
        paper_ids: List[UUID]
    ) -> List[PaperAnalysis]:
        """
        Analyze multiple papers in parallel with a limit of 3 concurrent analyses.

        Args:
            paper_ids: List of paper UUIDs to analyze

        Returns:
            List[PaperAnalysis]: List of analysis results
        """
        # We would need to fetch paper metadata and chunks for each paper_id
        # For now, this is a placeholder implementation
        # In a real implementation, you would:
        # 1. Fetch paper metadata and chunks for each paper_id from database
        # 2. Call analyze_paper for each
        # 3. Update paper processing_status after each completes

        # Placeholder: return empty list
        return []

    def format_chunks_for_prompt(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Format retrieved chunks into a clean evidence string.

        Args:
            chunks: List of chunk dictionaries with metadata

        Returns:
            str: Formatted string ready for the prompt
        """
        # Group chunks by section type
        grouped = self._group_chunks_by_section(chunks)

        formatted_parts = []

        # Process each section in order
        section_order = [
            "abstract", "introduction", "methodology",
            "results", "discussion", "conclusion", "limitations"
        ]

        for section in section_order:
            if section in grouped and grouped[section]:
                for chunk in grouped[section]:
                    # Format each chunk as: [Section: {section} | Page: {page}]
                    # {content}
                    section_name = chunk.get("section", section)
                    page_number = chunk.get("page_number", chunk.get("page", "Not reported"))
                    content = chunk.get("content", "")

                    # Truncate very long chunks to 800 tokens max (approx 3200 characters)
                    if len(content) > 3200:
                        content = content[:3200] + "..."

                    formatted_chunk = f"[Section: {section_name} | Page: {page_number}]\n{content}"
                    formatted_parts.append(formatted_chunk)

        # Join with separator
        return "\n\n---\n\n".join(formatted_parts)

    def validate_analysis_output(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate the LLM output and ensure all required fields are present.

        Args:
            raw: Raw dictionary from LLM output

        Returns:
            Dict[str, Any]: Validated and completed dictionary
        """
        # Define the expected structure with default values
        expected_structure = {
            "objective": "Not reported",
            "research_problem": "Not reported",
            "key_concepts": [],
            "methodology": {
                "approach": "Not reported",
                "algorithm_or_model": "Not reported",
                "dataset": "Not reported",
                "dataset_size": "Not reported",
                "evaluation_metrics": [],
                "baselines": [],
                "hardware": "Not reported",
                "reproducibility": "Not reported"
            },
            "key_findings": [],
            "advantages": [],
            "disadvantages": [],
            "limitations": [],
            "conclusion": "Not reported",
            "experimental_setup": "Not reported",
            "performance_results": "Not reported",
            "domain": "Not reported"
        }

        # Start with expected structure
        validated = expected_structure.copy()

        # Update with provided values, ensuring correct types
        for key, value in raw.items():
            if key in validated:
                # Handle nested dictionaries
                if isinstance(validated[key], dict) and isinstance(value, dict):
                    validated[key].update(value)
                elif isinstance(validated[key], list) and isinstance(value, list):
                    validated[key] = value
                else:
                    validated[key] = value

        # Ensure labels in key_findings, advantages, disadvantages, limitations are valid
        for finding in validated.get("key_findings", []):
            if isinstance(finding, dict) and "label" in finding:
                label = finding["label"]
                if label not in ["PAPER_REPORTED", "AI_INFERRED"]:
                    finding["label"] = "PAPER_REPORTED"  # Default to PAPER_REPORTED

        for advantage in validated.get("advantages", []):
            if isinstance(advantage, dict) and "label" in advantage:
                label = advantage["label"]
                if label not in ["PAPER_REPORTED", "AI_INFERRED"]:
                    advantage["label"] = "PAPER_REPORTED"

        for disadvantage in validated.get("disadvantages", []):
            if isinstance(disadvantage, dict) and "label" in disadvantage:
                label = disadvantage["label"]
                if label not in ["PAPER_REPORTED", "AI_INFERRED"]:
                    disadvantage["label"] = "PAPER_REPORTED"

        for limitation in validated.get("limitations", []):
            if isinstance(limitation, dict) and "label" in limitation:
                label = limitation["label"]
                if label not in ["PAPER_REPORTED", "AI_INFERRED"]:
                    limitation["label"] = "PAPER_REPORTED"

        return validated

    def _group_chunks_by_section(self, chunks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group chunks by section type.

        Args:
            chunks: List of chunk dictionaries

        Returns:
            Dict mapping section names to lists of chunks
        """
        grouped: Dict[str, List[Dict[str, Any]]] = {}

        for chunk in chunks:
            section = chunk.get("section", "").lower()
            # Normalize section names
            if section in ["abstract", "introduction", "methodology", "results",
                          "discussion", "conclusion", "limitations"]:
                if section not in grouped:
                    grouped[section] = []
                grouped[section].append(chunk)
            else:
                # Put unrecognized sections in a general category or skip
                # For now, we'll skip unrecognized sections
                pass

        return grouped

    def _get_analysis_schema(self) -> Dict[str, Any]:
        """
        Get the JSON schema for analysis validation.

        Returns:
            Dict[str, Any]: JSON schema for the analysis output
        """
        return {
            "type": "object",
            "properties": {
                "objective": {"type": "string"},
                "research_problem": {"type": "string"},
                "key_concepts": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "methodology": {
                    "type": "object",
                    "properties": {
                        "approach": {"type": "string"},
                        "algorithm_or_model": {"type": "string"},
                        "dataset": {"type": "string"},
                        "dataset_size": {"type": "string"},
                        "evaluation_metrics": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "baselines": {
                            "type": "array",
                            "items": {"type": "string"}
                        },
                        "hardware": {"type": "string"},
                        "reproducibility": {"type": "string"}
                    },
                    "required": [
                        "approach", "algorithm_or_model", "dataset", "dataset_size",
                        "evaluation_metrics", "baselines", "hardware", "reproducibility"
                    ]
                },
                "key_findings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "finding": {"type": "string"},
                            "label": {
                                "type": "string",
                                "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                            },
                            "evidence": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "page": {"type": ["integer", "null"]},
                                    "passage": {"type": "string"}
                                },
                                "required": ["section", "page", "passage"]
                            }
                        },
                        "required": ["finding", "label", "evidence"]
                    }
                },
                "advantages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "advantage": {"type": "string"},
                            "label": {
                                "type": "string",
                                "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                            },
                            "evidence": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "page": {"type": ["integer", "null"]}
                                },
                                "required": ["section", "page"]
                            }
                        },
                        "required": ["advantage", "label", "evidence"]
                    }
                },
                "disadvantages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "disadvantage": {"type": "string"},
                            "label": {
                                "type": "string",
                                "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                            },
                            "evidence": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "page": {"type": ["integer", "null"]}
                                },
                                "required": ["section", "page"]
                            }
                        },
                        "required": ["disadvantage", "label", "evidence"]
                    }
                },
                "limitations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "limitation": {"type": "string"},
                            "label": {
                                "type": "string",
                                "enum": ["PAPER_REPORTED", "AI_INFERRED"]
                            },
                            "evidence": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "page": {"type": ["integer", "null"]}
                                },
                                "required": ["section", "page"]
                            }
                        },
                        "required": ["limitation", "label", "evidence"]
                    }
                },
                "conclusion": {"type": "string"},
                "experimental_setup": {"type": "string"},
                "performance_results": {"type": "string"},
                "domain": {"type": "string"}
            },
            "required": [
                "objective", "research_problem", "key_concepts", "methodology",
                "key_findings", "advantages", "disadvantages", "limitations",
                "conclusion", "experimental_setup", "performance_results", "domain"
            ]
        }

    async def _store_analysis_in_supabase(
        self,
        paper_id: UUID,
        analysis: PaperAnalysis
    ) -> None:
        """
        Store the analysis results in Supabase.

        Args:
            paper_id: Unique identifier for the paper
            analysis: The analysis results to store
        """
        # Placeholder for Supabase storage
        # In a real implementation, you would:
        # 1. Initialize Supabase client with URL and key from environment
        # 2. Insert or update the paper_analysis table
        # 3. Handle any errors appropriately

        # For now, we'll just print what would be stored
        print(f"Would store analysis for paper {paper_id} in Supabase:")
        print(f"  Analysis: {analysis.model_dump_json(indent=2)}")


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the service
    pass
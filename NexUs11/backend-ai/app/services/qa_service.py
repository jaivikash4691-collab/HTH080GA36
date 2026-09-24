"""Service for handling user questions about uploaded papers."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .llm_service import LLMService
from .analysis_service import PaperAnalysis


class QuestionClassification(BaseModel):
    """Classification of a user question."""

    question_type: str  # FACTUAL / COMPARISON / SYNTHESIS / CONTRADICTION / GAP / METHODOLOGY / APPLICATION / GENERAL_SUMMARY
    target_papers: str  # ALL or SPECIFIC
    requires_cross_paper: bool
    key_concepts: List[str]
    suggested_sections: List[str]
    complexity: str  # SIMPLE or MODERATE or COMPLEX


class QAResponse(BaseModel):
    """Response to a user question."""

    answer: str
    citations: List[Dict[str, Any]]
    answer_type: str  # DIRECT / PARTIAL / INSUFFICIENT_EVIDENCE
    confidence: str  # HIGH / MEDIUM / LOW
    papers_referenced: List[str]
    synthesis_note: Optional[str] = None


class QAService:
    """Service for answering user questions about research papers."""

    def __init__(self) -> None:
        """Initialize the QA service."""
        self.llm_service = LLMService()

    async def classify_question(self, question: str) -> QuestionClassification:
        """
        Classify the user question to determine the best retrieval strategy.

        Args:
            question: User's question

        Returns:
            QuestionClassification: Classification of the question
        """
        if not question.strip():
            # Return a default classification for empty questions
            return QuestionClassification(
                question_type="GENERAL_SUMMARY",
                target_papers="ALL",
                requires_cross_paper=False,
                key_concepts=[],
                suggested_sections=[],
                complexity="SIMPLE"
            )

        # Define the exact prompt structure as specified
        system_prompt = """You are a question classifier for a research analysis system.
Classify the user question to determine the best retrieval strategy.
Output ONLY valid JSON."""

        user_prompt = f"""Question: "{question}"

Classify this question.

Return JSON:
{{
  "question_type": one of:
    FACTUAL /
    COMPARISON /
    SYNTHESIS /
    CONTRADICTION /
    GAP /
    METHODOLOGY /
    APPLICATION /
    GENERAL_SUMMARY,
  "target_papers": "ALL or SPECIFIC",
  "requires_cross_paper": true or false,
  "key_concepts": ["concept1", "concept2"],
  "suggested_sections": ["methodology", "results"],
  "complexity": "SIMPLE or MODERATE or COMPLEX"
}}"""

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_question_classification_schema()
            )

            # Convert to QuestionClassification object
            return QuestionClassification(**raw_result)

        except Exception as e:
            print(f"Error classifying question: {e}")
            # Return a default classification on error
            return QuestionClassification(
                question_type="GENERAL_SUMMARY",
                target_papers="ALL",
                requires_cross_paper=False,
                key_concepts=[],
                suggested_sections=[],
                complexity="SIMPLE"
            )

    async def answer_question(
        self,
        question: str,
        retrieved_chunks: List[Dict[str, Any]],
        paper_analyses: List[PaperAnalysis],
        session_context: List[Dict[str, Any]]
    ) -> QAResponse:
        """
        Answer a user question based on retrieved evidence.

        Args:
            question: User's question
            retrieved_chunks: List of retrieved chunks with metadata
            paper_analyses: List of PaperAnalysis objects
            session_context: Previous Q&A pairs in this session

        Returns:
            QAResponse: Answer to the question
        """
        if not question.strip():
            return QAResponse(
                answer="Please provide a valid question.",
                citations=[],
                answer_type="INSUFFICIENT_EVIDENCE",
                confidence="LOW",
                papers_referenced=[],
                synthesis_note=None
            )

        # Format chunks for the prompt
        formatted_chunks = ""
        for i, chunk in enumerate(retrieved_chunks):
            paper_title = chunk.get("paper_title", "Unknown Paper")
            section = chunk.get("section", "Not reported")
            page_number = chunk.get("page_number", chunk.get("page", "Not reported"))
            content = chunk.get("content", "")
            chunk_id = chunk.get("chunk_id", f"chunk_{i}")

            formatted_chunks += f"[Paper: {paper_title} | Section: {section} | Page: {page_number}]\n{content}\n\n"

        # Format session context (last 3 QA pairs)
        context_text = ""
        if session_context:
            # Take last 3 QA pairs
            recent_context = session_context[-3:] if len(session_context) >= 3 else session_context
            for i, qa_pair in enumerate(recent_context):
                if isinstance(qa_pair, dict):
                    q = qa_pair.get("question", "Not reported")
                    a = qa_pair.get("answer", "Not reported")
                    context_text += f"Q{i+1}: {q}\nA{i+1}: {a}\n\n"
                else:
                    context_text += f"QA Pair {i+1}: {str(qa_pair)}\n\n"
        else:
            context_text = "No previous Q&A in this session."

        # Define the exact prompt structure as specified
        system_prompt = """You are a research assistant answering questions about uploaded papers.
Rules you MUST follow:
1. Answer ONLY from the provided evidence chunks.
2. If the evidence does not support the answer, say:
   "Insufficient evidence in the uploaded documents to answer this question."
3. Every factual claim in your answer must include a citation:
   [Paper Title | Section | Page]
4. Do NOT answer from general knowledge about the topic.
5. Do NOT invent statistics, results, or conclusions.
6. If asked to compare papers, compare ONLY what the evidence shows.
7. If the papers disagree, show both sides clearly.
8. Label AI-synthesized insights as [SYNTHESIS] not [FINDING].
Output ONLY valid JSON."""

        user_prompt = f"""User question: "{question}"

Retrieved evidence:
{formatted_chunks}

Session context (previous Q&A in this session):
{context_text}

Answer the question based ONLY on the provided evidence.

Return JSON:
{{
  "answer": "string — the complete answer with inline citations",
  "citations": [
    {{
      "paper_title": "string",
      "section": "string",
      "page": number or null,
      "chunk_id": "uuid",
      "passage": "string — relevant excerpt"
    }}
  ],
  "answer_type": "DIRECT / PARTIAL / INSUFFICIENT_EVIDENCE",
  "confidence": "HIGH / MEDIUM / LOW",
  "papers_referenced": ["paper_title1"],
  "synthesis_note": "string — if the answer required synthesis, explain what was synthesized, or null
}}"""

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_qa_response_schema()
            )

            # Convert to QAResponse object
            # Handle citations validation
            qa_response_data = raw_result.copy()

            # Validate and clean citations
            if "citations" in qa_response_data and isinstance(qa_response_data["citations"], list):
                valid_citations = []
                for cit in qa_response_data["citations"]:
                    if isinstance(cit, dict):
                        # Ensure required fields exist
                        cleaned_cit = {
                            "paper_title": cit.get("paper_title", "Unknown Paper"),
                            "section": cit.get("section", "Not reported"),
                            "page": cit.get("page"),  # Can be null
                            "chunk_id": cit.get("chunk_id", f"unknown_{len(valid_citations)}"),
                            "passage": cit.get("passage", "")
                        }
                        valid_citations.append(cleaned_cit)
                qa_response_data["citations"] = valid_citations
            else:
                qa_response_data["citations"] = []

            # Validate answer_type
            valid_answer_types = ["DIRECT", "PARTIAL", "INSUFFICIENT_EVIDENCE"]
            if qa_response_data.get("answer_type") not in valid_answer_types:
                qa_response_data["answer_type"] = "INSUFFICIENT_EVIDENCE"

            # Validate confidence
            valid_confidence = ["HIGH", "MEDIUM", "LOW"]
            if qa_response_data.get("confidence") not in valid_confidence:
                qa_response_data["confidence"] = "LOW"

            # Ensure papers_referenced is a list
            if not isinstance(qa_response_data.get("papers_referenced"), list):
                qa_response_data["papers_referenced"] = []

            # Ensure synthesis_note is either a string or None
            if qa_response_data.get("synthesis_note") is not None and not isinstance(qa_response_data["synthesis_note"], str):
                qa_response_data["synthesis_note"] = str(qa_response_data["synthesis_note"])

            return QAResponse(**qa_response_data)

        except Exception as e:
            print(f"Error answering question: {e}")
            return QAResponse(
                answer=f"I encountered an error while processing your question: {str(e)}",
                citations=[],
                answer_type="INSUFFICIENT_EVIDENCE",
                confidence="LOW",
                papers_referenced=[],
                synthesis_note=None
            )

    async def answer_comparison_question(
        self,
        question: str,
        paper_a_chunks: List[Dict[str, Any]],
        paper_b_chunks: List[Dict[str, Any]],
        paper_a_analysis: PaperAnalysis,
        paper_b_analysis: PaperAnalysis
    ) -> QAResponse:
        """
        Answer a comparison question between two papers.

        Args:
            question: User's comparison question
            paper_a_chunks: Evidence chunks for paper A
            paper_b_chunks: Evidence chunks for paper B
            paper_a_analysis: Analysis of paper A
            paper_b_analysis: Analysis of paper B

        Returns:
            QAResponse: Answer to the comparison question
        """
        if not question.strip():
            return QAResponse(
                answer="Please provide a valid comparison question.",
                citations=[],
                answer_type="INSUFFICIENT_EVIDENCE",
                confidence="LOW",
                papers_referenced=[],
                synthesis_note=None
            )

        # Format chunks for paper A
        paper_a_chunks_text = ""
        for i, chunk in enumerate(paper_a_chunks):
            section = chunk.get("section", "Not reported")
            page_number = chunk.get("page_number", chunk.get("page", "Not reported"))
            content = chunk.get("content", "")
            chunk_id = chunk.get("chunk_id", f"paper_a_chunk_{i}")

            paper_a_chunks_text += f"[Section: {section} | Page: {page_number}]\n{content}\n\n"

        # Format chunks for paper B
        paper_b_chunks_text = ""
        for i, chunk in enumerate(paper_b_chunks):
            section = chunk.get("section", "Not reported")
            page_number = chunk.get("page_number", chunk.get("page", "Not reported"))
            content = chunk.get("content", "")
            chunk_id = chunk.get("chunk_id", f"paper_b_chunk_{i}")

            paper_b_chunks_text += f"[Section: {section} | Page: {page_number}]\n{content}\n\n"

        # Prepare paper analyses summaries
        paper_a_title = getattr(paper_a_analysis, 'objective', 'Paper A')
        paper_b_title = getattr(paper_b_analysis, 'objective', 'Paper B')

        paper_a_summary = f"""Objective: {getattr(paper_a_analysis, 'objective', 'Not reported')}
Key Findings: {json.dumps(getattr(paper_a_analysis, 'key_findings', []))}
Methodology: {json.dumps(getattr(paper_a_analysis, 'methodology', {}))}"""

        paper_b_summary = f"""Objective: {getattr(paper_b_analysis, 'objective', 'Not reported')}
Key Findings: {json.dumps(getattr(paper_b_analysis, 'key_findings', []))}
Methodology: {json.dumps(getattr(paper_b_analysis, 'methodology', {}))}"""

        # Define the exact prompt structure as specified for comparison questions
        system_prompt = """You are a research analyst comparing two or more papers.
You must compare ONLY what is explicitly reported or strongly implied
by the provided evidence.
You must never declare one paper superior without evidence.
You must present differences objectively.
Use "Not reported" for fields not found in the evidence.
Output ONLY valid JSON."""

        user_prompt = f"""Comparison question: "{question}"

Paper A — {paper_a_title}:
{paper_a_summary}
Evidence chunks: {paper_a_chunks_text}

Paper B — {paper_b_title}:
{paper_b_summary}
Evidence chunks: {paper_b_chunks_text}

Return JSON:
{{
  "comparison_summary": "string — overall comparison",
  "dimension_comparisons": [
    {{
      "dimension": "string — what is being compared",
      "paper_a_value": "string or Not reported",
      "paper_b_value": "string or Not reported",
      "winner": "PAPER_A / PAPER_B / INCONCLUSIVE / NOT_COMPARABLE",
      "reason": "string",
      "evidence_a": {{"section": "string", "page": number or null, "passage": "string"}},
      "evidence_b": {{"section": "string", "page": number or null, "passage": "string"}}
    }}
  ],
  "overall_conclusion": "string",
  "citations": [...]
}}"""

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_comparison_qa_response_schema()
            )

            # Convert to QAResponse object (we'll adapt the comparison response to QAResponse format)
            comparison_data = raw_result.copy()

            # Format the answer from the comparison result
            answer_parts = []

            if comparison_data.get("comparison_summary"):
                answer_parts.append(f"Overall Comparison: {comparison_data['comparison_summary']}")

            if comparison_data.get("dimension_comparisons"):
                answer_parts.append("\nDetailed Comparisons:")
                for dim_comp in comparison_data["dimension_comparisons"]:
                    dimension = dim_comp.get("dimension", "Unknown dimension")
                    paper_a_val = dim_comp.get("paper_a_value", "Not reported")
                    paper_b_val = dim_comp.get("paper_b_value", "Not reported")
                    winner = dim_comp.get("winner", "INCONCLUSIVE")
                    reason = dim_comp.get("reason", "Not reported")

                    answer_parts.append(f"\n{dimension}:")
                    answer_parts.append(f"  Paper A: {paper_a_val}")
                    answer_parts.append(f"  Paper B: {paper_b_val}")
                    answer_parts.append(f"  Winner: {winner}")
                    if reason and reason != "Not reported":
                        answer_parts.append(f"  Reason: {reason}")

                    # Add evidence citations if available
                    evidence_a = dim_comp.get("evidence_a", {})
                    evidence_b = dim_comp.get("evidence_b", {})

                    if evidence_a:
                        answer_parts.append(f"  Evidence A: [{evidence_a.get('section', 'Not reported')} | Page: {evidence_a.get('page', 'Not reported')}] {evidence_a.get('passage', '')}")
                    if evidence_b:
                        answer_parts.append(f"  Evidence B: [{evidence_b.get('section', 'Not reported')} | Page: {evidence_b.get('page', 'Not reported')}] {evidence_b.get('passage', '')}")

            if comparison_data.get("overall_conclusion"):
                answer_parts.append(f"\nOverall Conclusion: {comparison_data['overall_conclusion']}")

            answer = "\n".join(answer_parts) if answer_parts else "Unable to perform comparison based on provided evidence."

            # Extract and format citations
            citations = []
            # Add citations from dimension comparisons
            for dim_comp in comparison_data.get("dimension_comparisons", []):
                evidence_a = dim_comp.get("evidence_a", {})
                evidence_b = dim_comp.get("evidence_b", {})

                if evidence_a:
                    citations.append({
                        "paper_title": paper_a_title,
                        "section": evidence_a.get("section", "Not reported"),
                        "page": evidence_a.get("page"),
                        "chunk_id": f"paper_a_evidence_{len(citations)}",
                        "passage": evidence_a.get("passage", "")
                    })

                if evidence_b:
                    citations.append({
                        "paper_title": paper_b_title,
                        "section": evidence_b.get("section", "Not reported"),
                        "page": evidence_b.get("page"),
                        "chunk_id": f"paper_b_evidence_{len(citations)}",
                        "passage": evidence_b.get("passage", "")
                    })

            # Add any additional citations from the response
            for cit in comparison_data.get("citations", []):
                if isinstance(cit, dict):
                    citations.append({
                        "paper_title": cit.get("paper_title", "Unknown Paper"),
                        "section": cit.get("section", "Not reported"),
                        "page": cit.get("page"),
                        "chunk_id": cit.get("chunk_id", f"citation_{len(citations)}"),
                        "passage": cit.get("passage", "")
                    })

            # Determine answer type based on whether we found comparable evidence
            answer_type = "PARTIAL"  # Default for comparisons
            if not comparison_data.get("dimension_comparisons"):
                answer_type = "INSUFFICIENT_EVIDENCE"
            elif all(dc.get("winner") == "INCONCLUSIVE" for dc in comparison_data.get("dimension_comparisons", [])):
                answer_type = "PARTIAL"

            # Determine confidence
            confidence = "MEDIUM"  # Default
            if answer_type == "DIRECT":
                confidence = "HIGH"
            elif answer_type == "INSUFFICIENT_EVIDENCE":
                confidence = "LOW"

            # Papers referenced
            papers_referenced = [paper_a_title, paper_b_title]

            # Synthesis note for comparisons
            synthesis_note = "This answer required comparing evidence from two papers to identify similarities and differences."

            return QAResponse(
                answer=answer,
                citations=citations,
                answer_type=answer_type,
                confidence=confidence,
                papers_referenced=papers_referenced,
                synthesis_note=synthesis_note
            )

        except Exception as e:
            print(f"Error answering comparison question: {e}")
            return QAResponse(
                answer=f"I encountered an error while processing your comparison question: {str(e)}",
                citations=[],
                answer_type="INSUFFICIENT_EVIDENCE",
                confidence="LOW",
                papers_referenced=[],
                synthesis_note=None
            )

    async def handle_followup(
        self,
        original_question: str,
        original_answer: str,
        followup_question: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> QAResponse:
        """
        Handle a follow-up question using original context and new evidence.

        Args:
            original_question: The original question asked
            original_answer: The answer given to the original question
            followup_question: The follow-up question
            retrieved_chunks: New evidence retrieved for the follow-up

        Returns:
            QAResponse: Answer to the follow-up question
        """
        if not followup_question.strip():
            return QAResponse(
                answer="Please provide a valid follow-up question.",
                citations=[],
                answer_type="INSUFFICIENT_EVIDENCE",
                confidence="LOW",
                papers_referenced=[],
                synthesis_note=None
            )

        # Format chunks for the prompt
        formatted_chunks = ""
        for i, chunk in enumerate(retrieved_chunks):
            paper_title = chunk.get("paper_title", "Unknown Paper")
            section = chunk.get("section", "Not reported")
            page_number = chunk.get("page_number", chunk.get("page", "Not reported"))
            content = chunk.get("content", "")
            chunk_id = chunk.get("chunk_id", f"chunk_{i}")

            formatted_chunks += f"[Paper: {paper_title} | Section: {section} | Page: {page_number}]\n{content}\n\n"

        # Define the exact prompt structure as specified for follow-up questions
        system_prompt = """You are a research assistant handling a follow-up question.
The user is asking a follow-up to a previous question and answer.
Answer the follow-up using the original context AND new evidence.
Maintain consistency with the previous answer.
Do NOT contradict your previous answer without evidence.
If new evidence changes the answer, explicitly say so.
Output ONLY valid JSON with the same schema as the main Q&A."""

        user_prompt = f"""Original question: "{original_question}"
Original answer: "{original_answer}"
Follow-up question: "{followup_question}"

New evidence retrieved:
{formatted_chunks}

Answer the follow-up question."""

        # Call the LLM with the exact prompt structure
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # Use complete_with_schema to get structured JSON output
            raw_result = await self.llm_service.complete_with_schema(
                messages=messages,
                schema=self._get_qa_response_schema()
            )

            # Convert to QAResponse object (similar to answer_question method)
            qa_response_data = raw_result.copy()

            # Validate and clean citations
            if "citations" in qa_response_data and isinstance(qa_response_data["citations"], list):
                valid_citations = []
                for cit in qa_response_data["citations"]:
                    if isinstance(cit, dict):
                        # Ensure required fields exist
                        cleaned_cit = {
                            "paper_title": cit.get("paper_title", "Unknown Paper"),
                            "section": cit.get("section", "Not reported"),
                            "page": cit.get("page"),  # Can be null
                            "chunk_id": cit.get("chunk_id", f"unknown_{len(valid_citations)}"),
                            "passage": cit.get("passage", "")
                        }
                        valid_citations.append(cleaned_cit)
                qa_response_data["citations"] = valid_citations
            else:
                qa_response_data["citations"] = []

            # Validate answer_type
            valid_answer_types = ["DIRECT", "PARTIAL", "INSUFFICIENT_EVIDENCE"]
            if qa_response_data.get("answer_type") not in valid_answer_types:
                qa_response_data["answer_type"] = "INSUFFICIENT_EVIDENCE"

            # Validate confidence
            valid_confidence = ["HIGH", "MEDIUM", "LOW"]
            if qa_response_data.get("confidence") not in valid_confidence:
                qa_response_data["confidence"] = "LOW"

            # Ensure papers_referenced is a list
            if not isinstance(qa_response_data.get("papers_referenced"), list):
                qa_response_data["papers_referenced"] = []

            # Ensure synthesis_note is either a string or None
            if qa_response_data.get("synthesis_note") is not None and not isinstance(qa_response_data["synthesis_note"], str):
                qa_response_data["synthesis_note"] = str(qa_response_data["synthesis_note"])

            return QAResponse(**qa_response_data)

        except Exception as e:
            print(f"Error handling follow-up question: {e}")
            return QAResponse(
                answer=f"I encountered an error while processing your follow-up question: {str(e)}",
                citations=[],
                answer_type="INSUFFICIENT_EVIDENCE",
                confidence="LOW",
                papers_referenced=[],
                synthesis_note=None
            )

    # JSON Schema definitions for validation
    def _get_question_classification_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "question_type": {
                    "type": "string",
                    "enum": [
                        "FACTUAL", "COMPARISON", "SYNTHESIS", "CONTRADICTION",
                        "GAP", "METHODOLOGY", "APPLICATION", "GENERAL_SUMMARY"
                    ]
                },
                "target_papers": {
                    "type": "string",
                    "enum": ["ALL", "SPECIFIC"]
                },
                "requires_cross_paper": {"type": "boolean"},
                "key_concepts": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "suggested_sections": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "complexity": {
                    "type": "string",
                    "enum": ["SIMPLE", "MODERATE", "COMPLEX"]
                }
            },
            "required": ["question_type", "target_papers", "requires_cross_paper", "key_concepts", "suggested_sections", "complexity"]
        }

    def _get_qa_response_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "citations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "paper_title": {"type": "string"},
                            "section": {"type": "string"},
                            "page": {"type": ["integer", "null"]},
                            "chunk_id": {"type": "string"},
                            "passage": {"type": "string"}
                        },
                        "required": ["paper_title", "section", "page", "chunk_id", "passage"]
                    }
                },
                "answer_type": {
                    "type": "string",
                    "enum": ["DIRECT", "PARTIAL", "INSUFFICIENT_EVIDENCE"]
                },
                "confidence": {
                    "type": "string",
                    "enum": ["HIGH", "MEDIUM", "LOW"]
                },
                "papers_referenced": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "synthesis_note": {
                    "type": ["string", "null"]
                }
            },
            "required": ["answer", "citations", "answer_type", "confidence", "papers_referenced"]
        }

    def _get_comparison_qa_response_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "comparison_summary": {"type": "string"},
                "dimension_comparisons": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "dimension": {"type": "string"},
                            "paper_a_value": {"type": "string"},
                            "paper_b_value": {"type": "string"},
                            "winner": {
                                "type": "string",
                                "enum": ["PAPER_A", "PAPER_B", "INCONCLUSIVE", "NOT_COMPARABLE"]
                            },
                            "reason": {"type": "string"},
                            "evidence_a": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "page": {"type": ["integer", "null"]},
                                    "passage": {"type": "string"}
                                },
                                "required": ["section", "page", "passage"]
                            },
                            "evidence_b": {
                                "type": "object",
                                "properties": {
                                    "section": {"type": "string"},
                                    "page": {"type": ["integer", "null"]},
                                    "passage": {"type": "string"}
                                },
                                "required": ["section", "page", "passage"]
                            }
                        },
                        "required": ["dimension", "paper_a_value", "paper_b_value", "winner", "reason", "evidence_a", "evidence_b"]
                    }
                },
                "overall_conclusion": {"type": "string"},
                "citations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "paper_title": {"type": "string"},
                            "section": {"type": "string"},
                            "page": {"type": ["integer", "null"]},
                            "chunk_id": {"type": "string"},
                            "passage": {"type": "string"}
                        },
                        "required": ["paper_title", "section", "page", "chunk_id", "passage"]
                    }
                }
            },
            "required": ["comparison_summary", "dimension_comparisons", "overall_conclusion", "citations"]
        }


# Example usage (for testing purposes)
if __name__ == "__main__":
    # This would be used for testing the service
    pass
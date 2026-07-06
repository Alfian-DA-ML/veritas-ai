from typing import Literal
from pydantic import BaseModel, Field

# Added classes for structured response models used in the AI analysis service.
class EvidenceItem(BaseModel):
    title: str
    url: str
    source: str | None = None
    snippet: str | None = None

# AnalyzeResponse class defines the structure of the response returned by the analyze endpoint, including the title, verdict, confidence score, explanation, source URL, claims, evidence items, model name, and processing time.
class AnalyzeResponse(BaseModel):
    title: str
    verdict: Literal["real", "fake", "uncertain"]
    confidence_score: int = Field(ge=0, le=100)
    explanation: str
    source_url: str
    claims: list[str] = []
    evidence: list[EvidenceItem] = []
    model_name: str | None = None
    processing_time_ms: int | None = None

# ClaimExtractionOutput class defines the structure of the output for claim extraction, which includes a list of claims extracted from the analyzed content.
class ClaimExtractionOutput(BaseModel):
    claims: list[str] = Field(default_factory=list)

# GeminiAnalysisOutput class defines the structure of the output for the Gemini AI model analysis, which includes the verdict, confidence score, and explanation provided by the model.
class GeminiAnalysisOutput(BaseModel):
    verdict: Literal["real", "fake", "uncertain"]
    confidence_score: int = Field(ge=0, le=100)
    explanation: str
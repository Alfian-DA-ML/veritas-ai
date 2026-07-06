from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings
from app.exceptions.gemini import GeminiError
from app.models.response import ClaimExtractionOutput, GeminiAnalysisOutput

# GeminiService is responsible for interacting with the Gemini API to extract claims from a given prompt and analyze the authenticity of an article based on the provided prompt. It uses the ChatGoogleGenerativeAI model for claim extraction and analysis, and handles potential errors during the process.
class GeminiService:
    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise GeminiError("GEMINI_API_KEY is not configured.")

        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.1,
        )

        self.claim_llm = self.llm.with_structured_output(
            ClaimExtractionOutput
        )

        self.analysis_llm = self.llm.with_structured_output(
            GeminiAnalysisOutput
        )

    async def extract_claims(self, prompt: str) -> list[str]:
        try:
            response = await self.claim_llm.ainvoke(prompt)

            claims = [
                claim.strip()
                for claim in response.claims
                if claim and claim.strip()
            ]

            return claims[:3]

        except Exception as exc:
            raise GeminiError("Gemini claim extraction failed.") from exc

    async def analyze(self, prompt: str) -> dict:
        try:
            response = await self.analysis_llm.ainvoke(prompt)

            return {
                "verdict": response.verdict,
                "confidence_score": response.confidence_score,
                "explanation": response.explanation.strip(),
            }

        except Exception as exc:
            raise GeminiError("Gemini analysis failed.") from exc
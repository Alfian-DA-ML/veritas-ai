import time
from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.prompts.analyzer_prompt import (
    build_claim_extraction_prompt,
    build_fact_check_prompt,
)
from app.services.crawler import crawl_article
from app.services.gemini import GeminiService
from app.services.rag import retrieve_evidence

# AnalyzerService is responsible for analyzing a given URL, extracting claims, retrieving evidence, and providing a verdict on the article's authenticity.  
class AnalyzerService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.gemini_service = GeminiService()

    def current_date_context(self) -> str:
        try:
            return datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d")
        except Exception:
            return datetime.now().strftime("%Y-%m-%d")

    def fallback_uncertain_analysis(self, evidence_count: int) -> dict:
        if evidence_count == 0:
            return {
                "verdict": "uncertain",
                "confidence_score": 55,
                "explanation": (
                    "No sufficiently strong external evidence was found during the retrieval process, "
                    "so the article's main claims cannot be verified with high confidence. "
                    "This does not mean the article is necessarily false; it only indicates that the system "
                    "could not find enough supporting or contradicting sources for a reliable assessment."
                ),
            }

        return {
            "verdict": "uncertain",
            "confidence_score": 60,
            "explanation": (
                "The external evidence found is still limited, so the verification result should be "
                "interpreted with caution."
            ),
        }

    def calibrate_analysis(
        self,
        analysis: dict,
        evidence_items: list[dict],
    ) -> dict:
        evidence_count = len(evidence_items)

        verdict = analysis["verdict"]
        confidence = int(analysis["confidence_score"])
        explanation = analysis["explanation"]

        lower_explanation = explanation.lower()

        date_only_terms = [
            "date",
            "tanggal",
            "chronology",
            "kronologi",
            "masa depan",
            "future",
            "future date",
            "impossible as past",
        ]

        contradiction_terms = [
            "contradict",
            "contradiction",
            "bertentangan",
            "membantah",
            "tidak sesuai dengan bukti",
            "fabricated",
            "dipalsukan",
            "hoax",
            "false claim",
            "sumber membantah",
        ]

        has_date_issue = any(term in lower_explanation for term in date_only_terms)
        has_strong_contradiction = any(term in lower_explanation for term in contradiction_terms)

        if evidence_count == 0:
            return self.fallback_uncertain_analysis(evidence_count)

        if verdict == "fake" and has_date_issue and not has_strong_contradiction:
            return {
                "verdict": "uncertain",
                "confidence_score": min(confidence, 55),
                "explanation": (
                    "The main issue detected appears to be related to date or chronology interpretation, "
                    "but there is no strong external evidence contradicting the article. "
                    "Therefore, the article cannot be classified as false and should be verified further."
                ),
            }

        if evidence_count < 2 and confidence > 75:
            confidence = 75

        if verdict in {"real", "fake"} and confidence < 60:
            verdict = "uncertain"

        return {
            "verdict": verdict,
            "confidence_score": confidence,
            "explanation": explanation,
        }

    async def analyze_url(self, url: str) -> dict:
        started_at = time.perf_counter()

        title, article_text = await crawl_article(url)

        claim_prompt = build_claim_extraction_prompt(
            title=title,
            article_text=article_text,
        )

        claims = await self.gemini_service.extract_claims(claim_prompt)

        if not claims:
            claims = [title]

        retrieved_context, evidence_items = await retrieve_evidence(
            title=title,
            claims=claims,
        )

        if len(evidence_items) == 0:
            analysis = self.fallback_uncertain_analysis(0)
        else:
            fact_check_prompt = build_fact_check_prompt(
                title=title,
                article_text=article_text,
                claims=claims,
                retrieved_context=retrieved_context,
                current_date=self.current_date_context(),
            )

            raw_analysis = await self.gemini_service.analyze(fact_check_prompt)

            analysis = self.calibrate_analysis(
                analysis=raw_analysis,
                evidence_items=evidence_items,
            )

        processing_time_ms = int((time.perf_counter() - started_at) * 1000)

        return {
            "title": title,
            "verdict": analysis["verdict"],
            "confidence_score": analysis["confidence_score"],
            "explanation": analysis["explanation"],
            "source_url": url,
            "claims": claims,
            "evidence": [
                {
                    "title": item["title"],
                    "url": item["url"],
                    "source": item.get("source"),
                    "snippet": item.get("snippet"),
                }
                for item in evidence_items[:6]
            ],
            "model_name": self.settings.gemini_model,
            "processing_time_ms": processing_time_ms,
        }
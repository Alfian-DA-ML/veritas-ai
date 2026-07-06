from fastapi import APIRouter, Depends, HTTPException, status

from app.core.logger import logger
from app.core.security import verify_service_key
from app.exceptions.crawler import CrawlerError
from app.exceptions.gemini import GeminiError
from app.models.request import AnalyzeRequest
from app.models.response import AnalyzeResponse
from app.services.analyzer import AnalyzerService

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    return {
        "success": True,
        "message": "Veritas AI service is running.",
    }


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    dependencies=[Depends(verify_service_key)],
)

# Endpoint validates the service key, accepts a URL payload, and returns a structured AI analysis result.
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        service = AnalyzerService()
        result = await service.analyze_url(str(payload.url))

        return AnalyzeResponse(**result)

    except CrawlerError as exc:
        logger.warning("Crawler failed: %s", str(exc))

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except GeminiError as exc:
        logger.error("Gemini failed: %s", str(exc))

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI model failed to analyze the article.",
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected analyzer error.")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service failed to analyze the article.",
        ) from exc
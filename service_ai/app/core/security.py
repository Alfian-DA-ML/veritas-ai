from fastapi import Header, HTTPException, status
from app.core.config import get_settings


async def verify_service_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    settings = get_settings()

    if not settings.ai_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service API key is not configured.",
        )

    if x_api_key != settings.ai_service_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AI service API key.",
        )
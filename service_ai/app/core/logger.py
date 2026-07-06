import logging
from app.core.config import get_settings


def setup_logger() -> logging.Logger:
    settings = get_settings()

    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    return logging.getLogger(settings.app_name)


logger = setup_logger()
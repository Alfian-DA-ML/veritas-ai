import httpx
import trafilatura

from app.core.config import get_settings
from app.exceptions.crawler import ArticleExtractionError, ArticleFetchError
from app.utils.helpers import normalize_whitespace

# fetch_html is an asynchronous function that retrieves the HTML content of a given URL using the httpx library. It sets a custom User-Agent header to mimic a web browser and handles potential HTTP errors by raising an ArticleFetchError if the request fails.
async def fetch_html(url: str) -> str:
    settings = get_settings()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(
            timeout=settings.crawler_timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.text

    except httpx.HTTPError as exc:
        raise ArticleFetchError("Failed to fetch article URL.") from exc

# extract_article is a function that takes HTML content as input and extracts the article's title and main text using the trafilatura library. It also performs validation checks on the extracted content, raising an ArticleExtractionError if the extraction fails or if the content is too short.
def extract_article(html: str) -> tuple[str, str]:
    settings = get_settings()

    metadata = trafilatura.extract_metadata(html)
    title = metadata.title if metadata and metadata.title else "Untitled Article"

    article_text = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        favor_precision=True,
    )

    if not article_text:
        raise ArticleExtractionError("Unable to extract article content.")

    article_text = normalize_whitespace(article_text)

    if len(article_text) < settings.article_min_length:
        raise ArticleExtractionError("Extracted article content is too short.")

    article_text = article_text[: settings.article_max_chars]

    return title.strip(), article_text.strip()


async def crawl_article(url: str) -> tuple[str, str]:
    html = await fetch_html(url)
    return extract_article(html)
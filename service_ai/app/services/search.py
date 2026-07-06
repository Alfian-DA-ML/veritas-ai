import base64
import re
import xml.etree.ElementTree as ET
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import httpx

from app.core.config import get_settings
from app.core.logger import logger

# TRUSTED_HINTS is a list of trusted news sources and domains that are used to evaluate the credibility of retrieved evidence. The presence of these hints in a source's domain can increase the confidence score of the evidence.
TRUSTED_HINTS = [
    "reuters.com",
    "apnews.com",
    "bbc.com",
    "bbc.co.uk",
    "cnn.com",
    "nytimes.com",
    "washingtonpost.com",
    "theguardian.com",
    "aljazeera.com",
    "bloomberg.com",
    "ft.com",
    "wsj.com",
    "npr.org",
    "dw.com",
    "france24.com",
    "abc.net.au",
    "cbc.ca",
    "who.int",
    "un.org",
    "worldbank.org",
    "imf.org",
    "europa.eu",
    "gov",
    "edu",
    "kompas.com",
    "tempo.co",
    "detik.com",
    "cnnindonesia.com",
    "antaranews.com",
    "cnbcindonesia.com",
    "katadata.co.id",
    "kontan.co.id",
    "tirto.id",
    "bola.com",
    "liputan6.com",
    "suara.com",
    "kumparan.com",
]

# The following functions are utility functions used for processing and analyzing evidence retrieved from Bing News RSS feeds. They handle tasks such as cleaning HTML text, extracting domains from URLs, unwrapping Bing redirect URLs, scoring evidence based on title and source credibility, and searching for evidence related to specific claims.
def clean_html_text(text: str | None) -> str:
    if not text:
        return ""

    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()

# get_domain extracts the domain from a given URL.
def get_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        return parsed.netloc.replace("www.", "")
    except Exception:
        return ""

# get_text_by_local_name extracts the text content of a child element based on its local name.
def get_text_by_local_name(element: ET.Element, local_name: str) -> str:
    for child in element:
        tag = child.tag.split("}")[-1].lower()
        if tag == local_name.lower() and child.text:
            return child.text.strip()

    return ""

# decode_bing_base64_url decodes a base64-like URL encoded in the 'u' parameter of Bing redirect URLs.
def decode_bing_base64_url(value: str) -> str | None:
    """
    Some Bing redirect URLs store the target URL in a base64-like 'u' parameter.
    Example value may start with 'a1' before the encoded payload.
    """
    if not value:
        return None

    candidate = value

    if candidate.startswith("a1"):
        candidate = candidate[2:]

    try:
        padding = "=" * (-len(candidate) % 4)
        decoded = base64.urlsafe_b64decode(candidate + padding).decode("utf-8")

        if decoded.startswith("http"):
            return decoded

    except Exception:
        return None

    return None

# unwrap_bing_url extracts the original article URL from a Bing redirect URL when possible.
def unwrap_bing_url(link: str) -> str:
    """
    Bing News RSS sometimes returns Bing redirect links instead of direct article URLs.
    This function extracts the original article URL when possible.
    """
    if not link:
        return ""

    parsed = urlparse(link)
    domain = parsed.netloc.lower().replace("www.", "")
    query = parse_qs(parsed.query)

    if "bing.com" not in domain:
        return link

    for key in ["url", "r", "target", "to"]:
        value = query.get(key, [None])[0]

        if value:
            decoded = unquote(value)

            if decoded.startswith("http"):
                return decoded

    encoded_u = query.get("u", [None])[0]

    if encoded_u:
        decoded = decode_bing_base64_url(encoded_u)

        if decoded:
            return decoded

    return link

# is_trusted_source checks if the domain of a given URL is in the list of trusted sources.
def is_trusted_source(url: str) -> bool:
    domain = get_domain(url)
    return any(hint in domain for hint in TRUSTED_HINTS)

# score_evidence evaluates the credibility of a piece of evidence based on its title and source. It assigns points for matching terms in the title and for being from a trusted source.
def score_evidence(title: str, url: str, claim: str) -> int:
    score = 0
    title_lower = title.lower()

    claim_terms = [
        term
        for term in re.split(r"\W+", claim.lower())
        if len(term) >= 4
    ]

    score += sum(1 for term in claim_terms if term in title_lower)

    if is_trusted_source(url):
        score += 5

    return score

# search_evidence_for_claims retrieves evidence items for a list of claims by searching Bing News RSS feeds. It returns a list of evidence items, each containing the claim, title, URL, source, and snippet.
def normalize_source_name(source_name: str, url: str) -> str:
    if source_name:
        return source_name.strip()

    domain = get_domain(url)

    if domain:
        return domain

    return "Unknown source"

# search_bing_news searches the Bing News RSS feed for articles related to a specific claim and returns a list of evidence items.
async def search_bing_news(claim: str, limit: int) -> list[dict]:
    settings = get_settings()

    query = quote_plus(claim)
    rss_url = f"https://www.bing.com/news/search?q={query}&format=rss"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(
            timeout=settings.evidence_fetch_timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(rss_url, headers=headers)
            response.raise_for_status()

    except httpx.HTTPError as exc:
        logger.warning("Evidence search failed for claim '%s': %s", claim, str(exc))
        return []

    try:
        root = ET.fromstring(response.text)

    except ET.ParseError as exc:
        logger.warning("Failed to parse evidence RSS: %s", str(exc))
        return []

    items = []

    for item in root.findall(".//item"):
        title = item.findtext("title") or ""
        raw_link = item.findtext("link") or ""
        article_url = unwrap_bing_url(raw_link)
        description = clean_html_text(item.findtext("description"))

        source_name = (
            get_text_by_local_name(item, "source")
            or get_text_by_local_name(item, "Source")
            or get_text_by_local_name(item, "publisher")
            or get_text_by_local_name(item, "provider")
        )

        source = normalize_source_name(source_name, article_url)

        if not title or not article_url:
            continue

        items.append(
            {
                "title": title.strip(),
                "url": article_url.strip(),
                "source": source,
                "snippet": description[:300],
                "score": score_evidence(title, article_url, claim),
            }
        )

    items.sort(key=lambda item: item["score"], reverse=True)

    return items[:limit]

# search_evidence_for_claims retrieves evidence items for a list of claims by searching Bing News RSS feeds. It returns a list of evidence items, each containing the claim, title, URL, source, and snippet.
async def search_evidence_for_claims(claims: list[str]) -> list[dict]:
    settings = get_settings()

    all_results = []
    seen_urls = set()

    for claim in claims[: settings.evidence_max_claims]:
        results = await search_bing_news(
            claim=claim,
            limit=settings.evidence_results_per_claim,
        )

        for result in results:
            if result["url"] in seen_urls:
                continue

            seen_urls.add(result["url"])

            all_results.append(
                {
                    "claim": claim,
                    "title": result["title"],
                    "url": result["url"],
                    "source": result["source"],
                    "snippet": result["snippet"],
                }
            )

    return all_results
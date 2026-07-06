from app.services.search import search_evidence_for_claims


# evidence context is formatted to provide a clear and structured representation of the retrieved evidence items, including their claims, titles, sources, URLs, and snippets. If no evidence is found, a message indicating the lack of external evidence is returned.
def format_evidence_context(evidence_items: list[dict]) -> str:
    if not evidence_items:
        return (
            "No external evidence was found. "
            "Do not invent contradictions. "
            "The verdict should be uncertain because the article cannot be strongly verified."
        )

    blocks = []

    for index, item in enumerate(evidence_items, start=1):
        blocks.append(
            f"""
Evidence {index}
Claim/Query: {item.get("claim")}
Title: {item.get("title")}
Source: {item.get("source")}
URL: {item.get("url")}
Snippet: {item.get("snippet")}
""".strip()
        )

    return "\n\n".join(blocks)

# retrieve_evidence is an asynchronous function that takes a title and a list of claims as input, constructs search queries, retrieves evidence items for those claims using the search_evidence_for_claims function, and formats the retrieved evidence into a structured context string. It returns both the formatted context and the list of evidence items.
async def retrieve_evidence(title: str, claims: list[str]) -> tuple[str, list[dict]]:
    search_queries = []

    if title:
        search_queries.append(title)

    for claim in claims:
        if claim and claim not in search_queries:
            search_queries.append(claim)

    evidence_items = await search_evidence_for_claims(search_queries)
    context = format_evidence_context(evidence_items)

    return context, evidence_items
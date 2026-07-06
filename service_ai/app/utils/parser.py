import json
from app.exceptions.gemini import GeminiResponseError


def extract_json_from_text(raw_text: str) -> dict:
    cleaned = raw_text.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned.replace("```json", "", 1).strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```", "", 1).strip()

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise GeminiResponseError("Gemini returned invalid JSON.") from exc
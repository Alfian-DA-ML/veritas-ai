from app.exceptions.gemini import GeminiResponseError


def validate_analysis_payload(data: dict) -> dict:
    verdict = data.get("verdict")
    confidence_score = data.get("confidence_score")
    explanation = data.get("explanation")

    if verdict not in {"real", "fake", "uncertain"}:
        raise GeminiResponseError("Invalid verdict from Gemini.")

    if not isinstance(confidence_score, int):
        raise GeminiResponseError("Invalid confidence score from Gemini.")

    if confidence_score < 0 or confidence_score > 100:
        raise GeminiResponseError("Confidence score out of range.")

    if not isinstance(explanation, str) or not explanation.strip():
        raise GeminiResponseError("Invalid explanation from Gemini.")

    return {
        "verdict": verdict,
        "confidence_score": confidence_score,
        "explanation": explanation.strip(),
    }
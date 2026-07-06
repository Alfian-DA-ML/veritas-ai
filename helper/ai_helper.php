<?php

require_once __DIR__ . "/../config/ai.php";

function analyzeUrlWithAiService(string $url): array
{
    $payload = json_encode([
        "url" => $url
    ]);

    $ch = curl_init(AiConfig::serviceUrl());

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json",
            "X-API-Key: " . AiConfig::serviceKey()
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 120
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    curl_close($ch);

    if ($response === false) {
        throw new Exception("AI service request failed: " . $error);
    }

    $data = json_decode($response, true);

    if (!is_array($data)) {
        throw new Exception("AI service returned invalid JSON.");
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        $message = $data["detail"] ?? "AI service returned an error.";
        throw new Exception($message);
    }

    if (
        empty($data["title"]) ||
        empty($data["verdict"]) ||
        !isset($data["confidence_score"]) ||
        empty($data["explanation"])
    ) {
        throw new Exception("AI service returned invalid response.");
    }

    return $data;
}

?>
<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../helper/response.php";
require_once __DIR__ . "/../../helper/ai_helper.php";
require_once __DIR__ . "/../middleware/auth.php";

// Database connection
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendResponse(
        500,
        false,
        "Database connection failed."
    );
    exit();
}

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendResponse(
        405,
        false,
        "Method not allowed."
    );
    exit();
}

// Middleware: get authenticated user from JWT
$user = authUser();
$userId = $user->id;

// Read request body
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    $data = (object) $_POST;
}

// Validate URL
if (empty($data->url)) {
    sendResponse(
        400,
        false,
        "URL is required."
    );
    exit();
}

$url = trim($data->url);

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    sendResponse(
        400,
        false,
        "Invalid URL format."
    );
    exit();
}

try {
    // Weekly Usage Limit
    $limitQuery = "
        SELECT COUNT(*) AS total
        FROM analysis_usage_logs
        WHERE user_id = :user_id
        AND created_at >= NOW() - INTERVAL '7 days'
    ";

    $limitStmt = $db->prepare($limitQuery);
    $limitStmt->bindParam(":user_id", $userId);
    $limitStmt->execute();

    $limitResult = $limitStmt->fetch(PDO::FETCH_ASSOC);
    $weeklyCount = (int) ($limitResult["total"] ?? 0);

    if ($weeklyCount >= 3) {
        sendResponse(
            429,
            false,
            "Weekly analysis limit reached. You can analyze up to 3 articles per week."
        );
        exit();
    }

    // Call AI Service
    $aiResult = analyzeUrlWithAiService($url);

    $title = $aiResult["title"];
    $verdict = $aiResult["verdict"];
    $confidenceScore = $aiResult["confidence_score"];
    $explanation = $aiResult["explanation"];

    $claims = json_encode($aiResult["claims"] ?? []);
    $evidence = json_encode($aiResult["evidence"] ?? []);

    $modelName = $aiResult["model_name"] ?? null;
    $processingTimeMs = $aiResult["processing_time_ms"] ?? null;

    //Save Analysis History
    $query = "
        INSERT INTO analysis_history (
            user_id,
            url,
            title,
            verdict,
            confidence_score,
            explanation,
            claims,
            evidence,
            model_name,
            processing_time_ms
        )
        VALUES (
            :user_id,
            :url,
            :title,
            :verdict,
            :confidence_score,
            :explanation,
            :claims,
            :evidence,
            :model_name,
            :processing_time_ms
        )
        RETURNING id, created_at
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(":user_id", $userId);
    $stmt->bindParam(":url", $url);
    $stmt->bindParam(":title", $title);
    $stmt->bindParam(":verdict", $verdict);
    $stmt->bindParam(":confidence_score", $confidenceScore);
    $stmt->bindParam(":explanation", $explanation);
    $stmt->bindParam(":claims", $claims);
    $stmt->bindParam(":evidence", $evidence);
    $stmt->bindParam(":model_name", $modelName);
    $stmt->bindParam(":processing_time_ms", $processingTimeMs);

    $stmt->execute();

    $saved = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$saved || empty($saved["id"])) {
        throw new Exception("Failed to save analysis history.");
    }

    // Save usage log
    $analysisHistoryId = (int) $saved["id"];

    $usageQuery = "
        INSERT INTO analysis_usage_logs (
            user_id,
            analysis_history_id,
            url
        )
        VALUES (
            :user_id,
            :analysis_history_id,
            :url
        )
    ";

    $usageStmt = $db->prepare($usageQuery);

    $usageStmt->bindParam(":user_id", $userId);
    $usageStmt->bindParam(":analysis_history_id", $analysisHistoryId);
    $usageStmt->bindParam(":url", $url);

    $usageStmt->execute();


    //Response
    sendResponse(
        201,
        true,
        "Analysis completed successfully.",
        [
            "analysis" => [
                "id" => $saved["id"],
                "url" => $url,
                "title" => $title,
                "verdict" => $verdict,
                "confidence_score" => $confidenceScore,
                "explanation" => $explanation,
                "claims" => json_decode($claims, true),
                "evidence" => json_decode($evidence, true),
                "model_name" => $modelName,
                "processing_time_ms" => $processingTimeMs,
                "created_at" => $saved["created_at"]
            ]
        ]
    );
    exit();

} catch (PDOException $e) {
    error_log("Analysis Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Analysis failed. Please try again later."
    );
    exit();

} catch (Exception $e) {
    error_log("Analysis Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later (limit token)."
    );
    exit();
}

?>
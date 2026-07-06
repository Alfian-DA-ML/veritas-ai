<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../helper/response.php";
require_once __DIR__ . "/../middleware/auth.php";

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

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
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

// Validate user input (email, reset code)
try {
    $query = "
        SELECT
            id,
            url,
            title,
            verdict,
            confidence_score,
            explanation,
            claims,
            evidence,
            model_name,
            processing_time_ms,
            created_at
        FROM analysis_history
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT 20
    ";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":user_id", $userId);
    $stmt->execute();

    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($history as &$item) {
        $item["claims"] = is_string($item["claims"])
            ? json_decode($item["claims"], true)
            : ($item["claims"] ?? []);

        $item["evidence"] = is_string($item["evidence"])
            ? json_decode($item["evidence"], true)
            : ($item["evidence"] ?? []);
    }

    sendResponse(
        200,
        true,
        "Analysis history retrieved successfully.",
        [
            "history" => $history
        ]
    );
    exit();

} catch (PDOException $e) {
    error_log("History Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Failed to retrieve analysis history."
    );
    exit();
}

?>
<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../helper/response.php";

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    sendResponse(
        405,
        false,
        "Method not allowed."
    );
}

// Database connection
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendResponse(
        500,
        false,
        "Database connection failed."
    );
}

// Read Request
$data = json_decode(
    file_get_contents("php://input")
);

if (!$data) {
    $data = (object) $_POST;
}

// Validate user input (email, reset code)
if (
    empty($data->email) ||
    empty($data->reset_code)
) {
    sendResponse(
        400,
        false,
        "Email and reset code are required."
    );
}

$email = trim($data->email);
$resetCode = trim($data->reset_code);

// Validating email, reset code
try {
    $query = "
        SELECT id
        FROM password_resets
        WHERE email = :email
        AND reset_code = :reset_code
        AND is_used = FALSE
        AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(":email", $email);
    $stmt->bindParam(":reset_code", $resetCode);

    $stmt->execute();

    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        sendResponse(
            400,
            false,
            "Invalid or expired reset code."
        );
    }

    sendResponse(
        200,
        true,
        "Reset code verified successfully."
    );

} catch (PDOException $e) {
    error_log("Verify Reset Code Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Failed to verify reset code."
    );

} catch (Exception $e) {
    error_log("Verify Reset Code Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
}
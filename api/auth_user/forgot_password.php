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
require_once __DIR__ . "/../../helper/mail_helper.php";

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

// Validate user input
if (empty($data->email)) {
    sendResponse(
        400,
        false,
        "Email is required."
    );
}

$email = trim($data->email);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(
        400,
        false,
        "Invalid email format."
    );
}

// Check if email exists in the database
try {
    $query = "
        SELECT id, email
        FROM users
        WHERE email = :email
        LIMIT 1
    ";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $email);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse(
            404,
            false,
            "Email is not registered."
        );
    }

    // Generate reset code and expiration time
    $resetCode = (string) random_int(100000, 999999);
    $expiresAt = date(
        "Y-m-d H:i:sP",
        time() + (15 * 60)
    );

    // Invalidate any previous reset codes for this email
    $query = "
        UPDATE password_resets
        SET is_used = TRUE
        WHERE email = :email
        AND is_used = FALSE
    ";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $email);
    $stmt->execute();

    // Insert new reset code into the database
    $query = "
        INSERT INTO password_resets (
            email,
            reset_code,
            expires_at
        )
        VALUES (
            :email,
            :reset_code,
            :expires_at
        )
    ";

    // Prepare and execute the insert statement
    $stmt = $db->prepare($query);

    $stmt->bindParam(":email", $email);
    $stmt->bindParam(":reset_code", $resetCode);
    $stmt->bindParam(":expires_at", $expiresAt);

    // Execute the insert statement
    $stmt->execute();

    $isSent = sendResetCodeEmail(
        $email,
        $resetCode
    );

    if (!$isSent) {
        sendResponse(
            500,
            false,
            "Failed to send reset code email."
        );
    }

    sendResponse(
        200,
        true,
        "Reset code has been sent to your email."
    );

} catch (PDOException $e) {
    error_log("Forgot Password Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Failed to process forgot password request."
    );

} catch (Exception $e) {
    error_log("Forgot Password Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
}
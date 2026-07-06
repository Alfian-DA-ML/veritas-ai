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

// Validate user input
if (
    empty($data->email) ||
    empty($data->reset_code) ||
    empty($data->new_password)
) {
    sendResponse(
        400,
        false,
        "Email, reset code, and new password are required."
    );
}

// Validating email and new password
$email = trim($data->email);
$resetCode = trim($data->reset_code);
$newPassword = $data->new_password;

if (strlen($newPassword) < 8) {
    sendResponse(
        400,
        false,
        "Password must be at least 8 characters."
    );
}

// Validating email format
try {
    $db->beginTransaction();

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

    // Prepare and execute the query
    $stmt = $db->prepare($query);

    $stmt->bindParam(":email", $email);
    $stmt->bindParam(":reset_code", $resetCode);

    $stmt->execute();

    // Fetch the reset record
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        $db->rollBack();

        sendResponse(
            400,
            false,
            "Invalid or expired reset code."
        );
    }

    // Hash the new password
    $passwordHash = password_hash(
        $newPassword,
        PASSWORD_DEFAULT
    );

    // Update the user's password in the database
    $query = "
        UPDATE users
        SET password = :password
        WHERE email = :email
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(":password", $passwordHash);
    $stmt->bindParam(":email", $email);

    $stmt->execute();

    $query = "
        UPDATE password_resets
        SET is_used = TRUE
        WHERE id = :id
    ";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $reset["id"], PDO::PARAM_INT);
    $stmt->execute();

    $db->commit();

    sendResponse(
        200,
        true,
        "Password has been reset successfully."
    );

} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }

    error_log("Reset Password Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Failed to reset password."
    );

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }

    error_log("Reset Password Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
}
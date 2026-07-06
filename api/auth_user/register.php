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

$database = new Database();
$db = $database->getConnection();

// Check connection
if (!$db) {
    sendResponse(
        500,
        false,
        "Database connection failed."
    );
    exit();
}

// Read Request
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    $data = (object) $_POST;
}

// Validate user input
if (
    empty($data->username) ||
    empty($data->email) ||
    empty($data->password)
) {
    sendResponse(
        400,
        false,
        "All sections need to be filled in."
    );
    exit();
}

// Validating email
if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(
        400,
        false,
        "Email format isn't valid."
    );
    exit();
}

try {
    // Check username
    $query = "
    SELECT id FROM users
    WHERE username = :username
    LIMIT 1
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(
        ":username",
        $data->username
    );

    $stmt->execute();

    if ($stmt->fetch()) {
        sendResponse(
            409,
            false,
            "Username is already in use."
        );
        exit();
    }

    // Check email
    $query = "
    SELECT id FROM users
    WHERE email = :email
    LIMIT 1
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(
        ":email",
        $data->email
    );

    $stmt->execute();

    if ($stmt->fetch()) {
        sendResponse(
            409,
            false,
            "Email is already in use."
        );
        exit();
    }

    // Hash password
    $passwordHash = password_hash(
        $data->password,
        PASSWORD_DEFAULT
    );

    // Insert user
    $query = "
    INSERT INTO users (username, email, password)
    VALUES (:username, :email, :password)
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(
        ":username",
        $data->username
    );

    $stmt->bindParam(
        ":email",
        $data->email
    );

    $stmt->bindParam(
        ":password",
        $passwordHash
    );

    $stmt->execute();

    sendResponse(
        201,
        true,
        "Register successful."
    );
    exit();

} catch (PDOException $e) {
    error_log("Register Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Register failed. Please try again later."
    );
    exit();

} catch (Exception $e) {
    error_log("Register Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
    exit();
}

?>
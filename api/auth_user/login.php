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
require_once __DIR__ . "/../../helper/jwt_helper.php";

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
    empty($data->email) ||
    empty($data->password)
) {
    sendResponse(
        400,
        false,
        "Email and password are required."
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
    $query = "
    SELECT id, username, email, password
    FROM users
    WHERE email = :email
    LIMIT 1
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(
        ":email",
        $data->email
    );

    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        sendResponse(
            401,
            false,
            "Invalid email or password."
        );
        exit();
    }

    // Verify password
    if (!password_verify($data->password, $user["password"])) {
        sendResponse(
            401,
            false,
            "Invalid email or password."
        );
        exit();
    }

    // Generate JWT
    $token = generateToken([
        "id" => $user["id"],
        "username" => $user["username"],
        "email" => $user["email"]
    ]);

    sendResponse(
        200,
        true,
        "Login successful.",
        [
            "user" => [
                "id" => $user["id"],
                "username" => $user["username"],
                "email" => $user["email"]
            ],
            "token" => $token
        ]
    );
    exit();

} catch (PDOException $e) {
    error_log("Login Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Login failed. Please try again later."
    );
    exit();

} catch (Exception $e) {
    error_log("Login Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
    exit();
}

?>
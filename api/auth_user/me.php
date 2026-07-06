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

require_once __DIR__ . "/../../helper/response.php";
require_once __DIR__ . "/../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    sendResponse(
        405,
        false,
        "Method not allowed."
    );
    exit();
}

try {

    $user = authUser();

    sendResponse(
        200,
        true,
        "User authenticated.",
        [
            "user" => [
                "id" => $user->id,
                "username" => $user->username,
                "email" => $user->email
            ]
        ]
    );
    exit();

} catch (Exception $e) {

    error_log("Me Endpoint Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
    exit();

}

?>
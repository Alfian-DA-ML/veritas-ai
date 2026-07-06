<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../helper/response.php";
require_once __DIR__ . "/../middleware/auth.php";

if ($_SERVER["REQUEST_METHOD"] !== "DELETE") {
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

// Middleware: get authenticated user from JWT
$user = authUser();
$userId = $user->id;

if (
    empty($_GET["id"]) ||
    !is_numeric($_GET["id"])
) {
    sendResponse(
        400,
        false,
        "History ID is required."
    );
}

$historyId = (int) $_GET["id"];

// Validate and delete the history entry
try {
    $query = "
        DELETE FROM analysis_history
        WHERE id = :id
        AND user_id = :user_id
    ";

    $stmt = $db->prepare($query);

    $stmt->bindParam(
        ":id",
        $historyId,
        PDO::PARAM_INT
    );

    $stmt->bindParam(
        ":user_id",
        $userId,
        PDO::PARAM_INT
    );

    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        sendResponse(
            404,
            false,
            "History not found or you do not have permission to delete it."
        );
    }

    sendResponse(
        200,
        true,
        "History deleted successfully."
    );

} catch (PDOException $e) {
    error_log("Delete History Database Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Failed to delete history."
    );

} catch (Exception $e) {
    error_log("Delete History Error: " . $e->getMessage());

    sendResponse(
        500,
        false,
        "Something went wrong. Please try again later."
    );
}

?>
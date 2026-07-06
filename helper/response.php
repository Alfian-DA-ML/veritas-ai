<?php

function sendResponse(
    int $statusCode, 
    bool $success,
    string $message, 
    $data = null
) {
    http_response_code($statusCode);

    header("Content-Type: application/json; charset=UTF-8");

    echo json_encode([
        'success' => $success, 
        'message' => $message, 
        'data' => $data
    ]);

    exit;
}

?>
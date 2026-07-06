<?php

require_once __DIR__ . "/../../helper/response.php";
require_once __DIR__ . "/../../helper/jwt_helper.php";

function authUser()
{
    $token = getBearerToken();

    if (!$token) {
        sendResponse(
            401,
            false,
            "Access token is required."
        );
        exit();
    }

    $decoded = verifyToken($token);

    if (!$decoded) {
        sendResponse(
            401,
            false,
            "Invalid or expired token."
        );
        exit();
    }

    return $decoded->data;
}
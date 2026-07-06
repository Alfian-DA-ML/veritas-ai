<?php

require_once __DIR__ . "/../vendor/autoload.php";
require_once __DIR__ . "/../config/jwt.php";

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

function generateToken(array $user): string
{
    $issuedAt = time();

    $payload = [

        "iss" => JwtConfig::issuer(),

        "aud" => JwtConfig::audience(),

        "iat" => $issuedAt,

        "exp" => $issuedAt + JwtConfig::expire(),

        "data" => [

            "id" => $user["id"],

            "username" => $user["username"],

            "email" => $user["email"]

        ]

    ];

    return JWT::encode(
        $payload,
        JwtConfig::secret(),
        "HS256"
    );
}

function verifyToken(string $token)
{
    try {

        return JWT::decode(
            $token,
            new Key(
                JwtConfig::secret(),
                "HS256"
            )
        );

    } catch (Exception $e) {

        return false;

    }
}

function getBearerToken(): ?string
{
    $headers = getallheaders();

    $authorization = null;

    if (isset($headers["Authorization"])) {

        $authorization = $headers["Authorization"];

    } elseif (isset($headers["authorization"])) {

        $authorization = $headers["authorization"];

    }

    if (!$authorization) {

        return null;

    }

    if (
        preg_match(
            '/Bearer\s(\S+)/',
            $authorization,
            $matches
        )
    ) {

        return $matches[1];

    }

    return null;
}
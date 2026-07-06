<?php

require_once __DIR__ . "/../vendor/autoload.php";

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . "/../");
$dotenv->safeLoad();

class AiConfig
{
    public static function serviceUrl(): string
    {
        return $_ENV["AI_SERVICE_URL"];
    }

    public static function serviceKey(): string
    {
        return $_ENV["AI_SERVICE_API_KEY"];
    }
}
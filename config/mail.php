<?php

require_once __DIR__ . "/../vendor/autoload.php";

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . "/../");
$dotenv->safeLoad();

class MailConfig
{
    public static function host(): string
    {
        return $_ENV["MAIL_HOST"];
    }

    public static function port(): int
    {
        return (int) $_ENV["MAIL_PORT"];
    }

    public static function username(): string
    {
        return $_ENV["MAIL_USERNAME"];
    }

    public static function password(): string
    {
        return $_ENV["MAIL_PASSWORD"];
    }

    public static function encryption(): string
    {
        return $_ENV["MAIL_ENCRYPTION"];
    }

    public static function from(): string
    {
        return $_ENV["MAIL_FROM"];
    }

    public static function fromName(): string
    {
        return $_ENV["MAIL_FROM_NAME"];
    }
}
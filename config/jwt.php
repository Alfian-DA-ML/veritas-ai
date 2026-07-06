<?php

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

class JwtConfig
{
    public static function secret(): string
    {
        return $_ENV['JWT_SECRET'];
    }

    public static function issuer(): string
    {
        return $_ENV['JWT_ISSUER'];
    }

    public static function audience(): string
    {
        return $_ENV['JWT_AUDIENCE'];
    }

    public static function expire(): int
    {
        return (int) $_ENV['JWT_EXPIRE'];
    }
}
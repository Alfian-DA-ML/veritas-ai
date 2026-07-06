<?php

require_once __DIR__ .'/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

class Database{
    private string $host;
    private string $port;
    private string $dbName;
    private string $user;
    private string $password;
    
    private ?PDO $conn = null;

    public function __construct(){
        $this->host = $_ENV['DB_HOST'];
        $this->port = $_ENV['DB_PORT'];
        $this->dbName = $_ENV['DB_NAME'];
        $this->user = $_ENV['DB_USER'];
        $this->password = $_ENV['DB_PASSWORD'];
    }

    public function getConnection(){
        $this->conn = null;


        try {
            $dsn = "pgsql:host={$this->host};" . "port={$this->port};" . "dbname={$this->dbName}";
            
            $this->conn = new PDO(
                $dsn,
                $this->user,
                $this->password
            );
            
            $this->conn->setAttribute(
                PDO::ATTR_ERRMODE,
                PDO::ERRMODE_EXCEPTION
            );

        }

        catch (PDOException $e) {
            error_log(
                "Database Connection Error: " .
                $e->getMessage()
            );

            return null;

        }

        return $this->conn;
    }

}

?>
<?php

require_once __DIR__ . '/bootstrap.php';

class Database
{
    /**
     * Credenciales desde .env (ver .env.example). Si no existe .env se usan
     * los valores por defecto de desarrollo local con XAMPP.
     */
    public function connect()
    {
        $host   = env('DB_HOST', 'localhost');
        $nombre = env('DB_NAME', 'inventario_db');
        $user   = env('DB_USER', 'root');
        $pass   = env('DB_PASS', '');

        try {
            $conn = new PDO(
                "mysql:host={$host};dbname={$nombre};charset=utf8mb4",
                $user,
                $pass
            );

            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            return $conn;

        } catch (PDOException $e) {

            error_log("Database connection error: " . $e->getMessage());

            http_response_code(500);
            header('Content-Type: application/json');

            die(json_encode([
                "success" => false,
                "message" => "Error de conexión a la base de datos"
            ]));
        }
    }
}

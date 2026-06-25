<?php

class Database
{
    private $host = "localhost";
    private $db_name = "inventario_db";
    private $username = "root";
    private $password = "";

    public function connect()
    {
        try {
            $conn = new PDO(
                "mysql:host={$this->host};dbname={$this->db_name};charset=utf8",
                $this->username,
                $this->password
            );

            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            return $conn;

        } catch (PDOException $e) {

            error_log("Database connection error: " . $e->getMessage());

            die(json_encode([
                "success" => false,
                "message" => "Error de conexión a la base de datos"
            ]));
        }
    }
}

<?php

class Log
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function registrar($usuario_id, $usuario_nombre, $accion, $detalle = '')
    {
        $stmt = $this->conn->prepare("
            INSERT INTO logs (usuario_id, usuario_nombre, accion, detalle)
            VALUES (:usuario_id, :usuario_nombre, :accion, :detalle)
        ");

        return $stmt->execute([
            ':usuario_id'      => $usuario_id,
            ':usuario_nombre'  => $usuario_nombre,
            ':accion'          => $accion,
            ':detalle'         => $detalle
        ]);
    }

    public function obtenerTodos()
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM logs ORDER BY created_at DESC LIMIT 100
        ");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
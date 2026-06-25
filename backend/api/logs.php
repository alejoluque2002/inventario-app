<?php

require_once "../auth/protect.php";

header("Content-Type: application/json");

// Solo el admin puede ver los logs
if ($_SESSION['usuario_rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["message" => "No autorizado"]);
    exit;
}

require_once "../config/database.php";
require_once "../models/log.php";

$database = new Database();
$db = $database->connect();

$log = new Log($db);

echo json_encode($log->obtenerTodos());
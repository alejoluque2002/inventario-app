<?php

require_once "../auth/protect.php";

header("Content-Type: application/json");

if ($_SESSION['usuario_rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["message" => "No autorizado"]);
    exit;
}

require_once "../config/database.php";

$database = new Database();
$db = $database->connect();

$stmt = $db->prepare("SELECT * FROM api_keys ORDER BY id ASC");
$stmt->execute();

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
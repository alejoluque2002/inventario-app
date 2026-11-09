<?php

require_once __DIR__ . '/../auth/protect.php';

header("Content-Type: application/json");

// Solo el admin puede ver el historial de movimientos de stock
if (($_SESSION['usuario_rol'] ?? '') !== 'admin') {
    responderJson(403, ["message" => "No autorizado"]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    responderJson(405, ["message" => "Método no permitido"]);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/movimiento.php';

// Filtro opcional por producto: ?producto_id=5
$productoId = null;

if (isset($_GET['producto_id'])) {
    $productoId = filter_var($_GET['producto_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

    if ($productoId === false) {
        responderJson(400, ["message" => "producto_id inválido"]);
        exit;
    }
}

// Número máximo de filas: ?limite=100 (por defecto 200, máximo 500)
$limite = filter_var(
    $_GET['limite'] ?? 200,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1, 'max_range' => 500]]
);

if ($limite === false) {
    $limite = 200;
}

$database = new Database();
$db = $database->connect();

$movimientos = new MovimientoStock($db);

responderJson(200, $movimientos->obtener($productoId, $limite));
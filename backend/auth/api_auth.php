<?php

function autenticarApiKey($permisoRequerido = 'lectura')
{
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $_GET['api_key'] ?? null;

    if (!$apiKey) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'API key requerida'
        ]);
        exit;
    }

    require_once __DIR__ . '/../config/database.php';
    $database = new Database();
    $db = $database->connect();

    $stmt = $db->prepare("
        SELECT * FROM api_keys
        WHERE api_key = :key AND activa = 1
    ");
    $stmt->execute([':key' => $apiKey]);
    $keyData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$keyData) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'API key inválida o desactivada'
        ]);
        exit;
    }

    if (
        $permisoRequerido === 'escritura' &&
        $keyData['permisos'] !== 'escritura'
    ) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => 'Esta API key no tiene permisos de escritura'
        ]);
        exit;
    }

    return $keyData;
}
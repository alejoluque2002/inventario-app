<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Valida la API key de la petición y devuelve sus datos.
 * Recomendado: cabecera "X-API-Key". También se admite ?api_key= por
 * compatibilidad, pero las URLs acaban en logs, así que es menos seguro.
 */
function autenticarApiKey($permisoRequerido = 'lectura')
{
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? null;

    if (!$apiKey && function_exists('getallheaders')) {
        $headers = array_change_key_case(getallheaders(), CASE_LOWER);
        $apiKey = $headers['x-api-key'] ?? null;
    }

    if (!$apiKey) {
        $apiKey = $_GET['api_key'] ?? null;
    }

    if (!$apiKey || !is_string($apiKey)) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'API key requerida'
        ]);
        exit;
    }

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

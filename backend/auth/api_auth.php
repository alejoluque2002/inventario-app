<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/rate_limit_api.php';

// Cada nivel incluye los anteriores:
//   lectura   -> GET
//   escritura -> GET, POST, PUT
//   completo  -> GET, POST, PUT, DELETE
const NIVELES_API_KEY = ['lectura' => 1, 'escritura' => 2, 'completo' => 3];

/**
 * Valida la API key de la petición y devuelve sus datos (id, nombre, permisos).
 * Recomendado: cabecera "X-API-Key". También se admite ?api_key= por
 * compatibilidad, pero las URLs acaban en logs, así que es menos seguro.
 * En la base de datos solo se guarda el hash SHA-256 de la clave, nunca la clave.
 *
 * Orden de comprobaciones: clave válida y activa -> no caducada -> límite de
 * peticiones por minuto -> permisos suficientes para la operación.
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
        SELECT id, nombre, permisos, limite_minuto,
               (expires_at IS NOT NULL AND expires_at < CURDATE()) AS caducada
        FROM api_keys
        WHERE key_hash = :hash AND activa = 1
    ");
    $stmt->execute([':hash' => hash('sha256', $apiKey)]);
    $keyData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$keyData) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'API key inválida o desactivada'
        ]);
        exit;
    }

    if ((int) $keyData['caducada'] === 1) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'API key caducada'
        ]);
        exit;
    }

    [$permitido, $espera] = apiRegistrarPeticion($keyData['id'], (int) $keyData['limite_minuto']);

    if (!$permitido) {
        http_response_code(429);
        header('Retry-After: ' . $espera);
        echo json_encode([
            'success' => false,
            'error'   => 'Demasiadas peticiones con esta API key. Inténtalo de nuevo en ' . $espera . ' segundos'
        ]);
        exit;
    }

    $nivelClave = NIVELES_API_KEY[$keyData['permisos']] ?? 0;
    $nivelNecesario = NIVELES_API_KEY[$permisoRequerido] ?? PHP_INT_MAX;

    if ($nivelClave < $nivelNecesario) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error'   => "Esta API key no tiene permisos suficientes (se requiere '" . $permisoRequerido . "')"
        ]);
        exit;
    }

    // Último uso: como máximo una escritura por minuto y clave
    try {
        $stmt = $db->prepare("
            UPDATE api_keys SET last_used_at = NOW()
            WHERE id = :id AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL 1 MINUTE)
        ");
        $stmt->execute([':id' => $keyData['id']]);
    } catch (Throwable $e) {
        error_log("No se pudo actualizar el último uso de la API key: " . $e->getMessage());
    }

    return $keyData;
}
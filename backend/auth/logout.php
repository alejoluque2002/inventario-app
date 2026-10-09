<?php

require_once __DIR__ . '/session.php';

header("Content-Type: application/json");

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responderJson(405, ['success' => false, 'message' => 'Método no permitido']);
    exit;
}

exigirPeticionAjax();

iniciarSesion();

$_SESSION = [];

// Eliminar también la cookie de sesión del navegador
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();

    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $p['path'],
        'domain'   => $p['domain'],
        'secure'   => $p['secure'],
        'httponly' => $p['httponly'],
        'samesite' => $p['samesite'] ?? 'Lax',
    ]);
}

session_destroy();

echo json_encode([
    "success" => true
]);

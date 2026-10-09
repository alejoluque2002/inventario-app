<?php

require_once __DIR__ . '/../config/bootstrap.php';

/**
 * Inicia la sesión con cookies seguras (HttpOnly, SameSite y Secure bajo HTTPS).
 */
function iniciarSesion()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443);

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

/**
 * Defensa CSRF: toda petición que modifica datos debe llevar la cabecera
 * X-Requested-With. Un formulario o una web de terceros no puede añadirla
 * (el navegador exigiría un preflight CORS que este backend no concede).
 */
function exigirPeticionAjax()
{
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if (in_array($metodo, ['GET', 'HEAD', 'OPTIONS'], true)) {
        return;
    }

    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
        responderJson(403, [
            'success' => false,
            'message' => 'Petición no válida'
        ]);
        exit;
    }
}

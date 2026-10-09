<?php

require_once __DIR__ . '/session.php';

iniciarSesion();

if (!isset($_SESSION['usuario_id'])) {

    responderJson(401, [
        "message" => "No autorizado"
    ]);

    exit;
}

// Protección CSRF en peticiones que modifican datos
exigirPeticionAjax();

// Liberar el bloqueo de sesión (los datos de $_SESSION siguen siendo legibles)
session_write_close();

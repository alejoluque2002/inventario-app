<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json");

if (isset($_SESSION['usuario_id'])) {

    $usuario = [
        "id"     => $_SESSION['usuario_id'],
        "nombre" => $_SESSION['usuario_nombre'],
        "rol"    => $_SESSION['usuario_rol']
    ];

    session_write_close();

    echo json_encode([
        "authenticated" => true,
        "usuario" => $usuario
    ]);

} else {

    session_write_close();

    http_response_code(401);

    echo json_encode([
        "authenticated" => false
    ]);
}
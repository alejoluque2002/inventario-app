<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['usuario_id'])) {

    http_response_code(401);

    header("Content-Type: application/json");

    echo json_encode([
        "message" => "No autorizado"
    ]);

    exit;
}

session_write_close();
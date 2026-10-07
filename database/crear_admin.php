<?php

/**
 * Crea (o promueve) un usuario administrador desde la terminal.
 * Uso:  php database/crear_admin.php "Nombre" email@dominio.com
 * La contraseña se pide por pantalla; no se guarda ninguna por defecto en el repositorio.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../backend/config/database.php';

if ($argc < 3) {
    fwrite(STDERR, "Uso: php database/crear_admin.php \"Nombre\" email@dominio.com\n");
    exit(1);
}

$nombre = trim($argv[1]);
$email  = trim($argv[2]);

if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Nombre o email no válidos.\n");
    exit(1);
}

echo "Contraseña (8-72 caracteres): ";
$password = rtrim((string) fgets(STDIN), "\r\n");

if (strlen($password) < 8 || strlen($password) > 72) {
    fwrite(STDERR, "La contraseña debe tener entre 8 y 72 caracteres.\n");
    exit(1);
}

$db = (new Database())->connect();

$stmt = $db->prepare("SELECT id FROM usuarios WHERE email = :email");
$stmt->execute([':email' => $email]);

if ($stmt->fetch()) {
    fwrite(STDERR, "Ya existe un usuario con ese email.\n");
    exit(1);
}

$stmt = $db->prepare("
    INSERT INTO usuarios (nombre, email, password, rol)
    VALUES (:nombre, :email, :password, 'admin')
");
$stmt->execute([
    ':nombre'   => $nombre,
    ':email'    => $email,
    ':password' => password_hash($password, PASSWORD_DEFAULT)
]);

echo "Administrador creado: {$email}\n";

<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json");

// Solo el admin puede registrar usuarios
if (!isset($_SESSION['usuario_id']) || $_SESSION['usuario_rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

require_once "../config/database.php";

$database = new Database();
$db = $database->connect();

$data = json_decode(file_get_contents("php://input"), true);

if (
    !$data ||
    empty($data['nombre']) ||
    empty($data['email']) ||
    empty($data['password']) ||
    empty($data['rol'])
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
    exit;
}

// Comprobar si el email ya existe
$stmt = $db->prepare("SELECT id FROM usuarios WHERE email = :email");
$stmt->execute([':email' => $data['email']]);

if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
    exit;
}

$hash = password_hash($data['password'], PASSWORD_DEFAULT);

$stmt = $db->prepare("
    INSERT INTO usuarios (nombre, email, password, rol)
    VALUES (:nombre, :email, :password, :rol)
");

$resultado = $stmt->execute([
    ':nombre'   => $data['nombre'],
    ':email'    => $data['email'],
    ':password' => $hash,
    ':rol'      => $data['rol']
]);

echo json_encode(['success' => $resultado]);
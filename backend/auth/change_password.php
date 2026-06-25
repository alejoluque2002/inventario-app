<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json");

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

require_once "../config/database.php";

$database = new Database();
$db = $database->connect();

$data = json_decode(file_get_contents("php://input"), true);

if (
    !$data ||
    empty($data['password_actual']) ||
    empty($data['password_nuevo'])
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
    exit;
}

// Verificar contraseña actual
$stmt = $db->prepare("SELECT password FROM usuarios WHERE id = :id");
$stmt->execute([':id' => $_SESSION['usuario_id']]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!password_verify($data['password_actual'], $usuario['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'La contraseña actual no es correcta']);
    exit;
}

$hash = password_hash($data['password_nuevo'], PASSWORD_DEFAULT);

$stmt = $db->prepare("UPDATE usuarios SET password = :password WHERE id = :id");
$resultado = $stmt->execute([
    ':password' => $hash,
    ':id'       => $_SESSION['usuario_id']
]);

echo json_encode(['success' => $resultado]);
<?php

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/../config/database.php';

iniciarSesion();

header("Content-Type: application/json");

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responderJson(405, ['success' => false, 'message' => 'Método no permitido']);
    exit;
}

exigirPeticionAjax();

$database = new Database();
$db = $database->connect();

$data = json_decode(file_get_contents("php://input"), true);

if (
    !is_array($data) ||
    empty($data['password_actual']) || !is_string($data['password_actual']) ||
    empty($data['password_nuevo']) || !is_string($data['password_nuevo'])
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
    exit;
}

// bcrypt solo usa los primeros 72 bytes
if (strlen($data['password_nuevo']) < 8 || strlen($data['password_nuevo']) > 72) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'La nueva contraseña debe tener entre 8 y 72 caracteres']);
    exit;
}

// Verificar contraseña actual
$stmt = $db->prepare("SELECT password FROM usuarios WHERE id = :id");
$stmt->execute([':id' => $_SESSION['usuario_id']]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$usuario || !password_verify($data['password_actual'], $usuario['password'])) {
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

if ($resultado) {
    // Nuevo identificador de sesión tras un cambio de credenciales
    session_regenerate_id(true);
}

echo json_encode(['success' => $resultado]);

<?php

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/../config/database.php';

iniciarSesion();

header("Content-Type: application/json");

// Solo el admin puede registrar usuarios
if (!isset($_SESSION['usuario_id']) || ($_SESSION['usuario_rol'] ?? '') !== 'admin') {
    http_response_code(403);
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
    empty($data['nombre']) || !is_string($data['nombre']) ||
    empty($data['email']) || !is_string($data['email']) ||
    empty($data['password']) || !is_string($data['password']) ||
    empty($data['rol']) || !is_string($data['rol'])
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
    exit;
}

$nombre = trim($data['nombre']);
$email  = trim($data['email']);

if ($nombre === '' || mb_strlen($nombre) > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El nombre debe tener entre 1 y 100 caracteres']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El email no es válido']);
    exit;
}

if (strlen($data['password']) < 8 || strlen($data['password']) > 72) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'La contraseña debe tener entre 8 y 72 caracteres']);
    exit;
}

if (!in_array($data['rol'], ['admin', 'empleado'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El rol no es válido']);
    exit;
}

// Comprobar si el email ya existe
$stmt = $db->prepare("SELECT id FROM usuarios WHERE email = :email");
$stmt->execute([':email' => $email]);

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

try {
    $resultado = $stmt->execute([
        ':nombre'   => $nombre,
        ':email'    => $email,
        ':password' => $hash,
        ':rol'      => $data['rol']
    ]);
} catch (PDOException $e) {
    if (esErrorDuplicado($e)) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'El email ya está registrado']);
        exit;
    }
    throw $e;
}

echo json_encode(['success' => $resultado]);

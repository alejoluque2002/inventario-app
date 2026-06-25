<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json");

require_once "../config/database.php";

$database = new Database();
$db = $database->connect();

$data = json_decode(
    file_get_contents("php://input"),
    true
);

if (
    !$data ||
    empty($data['email']) ||
    empty($data['password'])
) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Email y contraseña son requeridos'
    ]);
    exit;
}

$query = "
SELECT *
FROM usuarios
WHERE email = :email
";

$stmt = $db->prepare($query);

$stmt->execute([
    ':email' => $data['email']
]);

$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

if (
    $usuario &&
    password_verify(
        $data['password'],
        $usuario['password']
    )
) {
    $_SESSION['usuario_id']     = $usuario['id'];
    $_SESSION['usuario_nombre'] = $usuario['nombre'];
    $_SESSION['usuario_rol']    = $usuario['rol'];

    echo json_encode(['success' => true]);

} else {

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Credenciales incorrectas'
    ]);
}
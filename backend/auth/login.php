<?php

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/../config/database.php';

iniciarSesion();

header("Content-Type: application/json");

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responderJson(405, ['success' => false, 'message' => 'Método no permitido']);
    exit;
}

exigirPeticionAjax();

$data = json_decode(file_get_contents("php://input"), true);

if (
    !is_array($data) ||
    empty($data['email']) || !is_string($data['email']) ||
    empty($data['password']) || !is_string($data['password'])
) {
    responderJson(400, [
        'success' => false,
        'message' => 'Email y contraseña son requeridos'
    ]);
    exit;
}

$email = trim($data['email']);
$claveIntentos = strtolower($email) . '|' . ($_SERVER['REMOTE_ADDR'] ?? '');

if (loginBloqueado($claveIntentos)) {
    header('Retry-After: ' . LOGIN_VENTANA_SEGUNDOS);
    responderJson(429, [
        'success' => false,
        'message' => 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.'
    ]);
    exit;
}

$database = new Database();
$db = $database->connect();

$stmt = $db->prepare("SELECT * FROM usuarios WHERE email = :email");
$stmt->execute([':email' => $email]);
$usuario = $stmt->fetch(PDO::FETCH_ASSOC);

// Se verifica siempre contra un hash (aunque el usuario no exista) para que
// el tiempo de respuesta no revele qué emails están registrados.
$hash = $usuario
    ? $usuario['password']
    : '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

$credencialesValidas = password_verify($data['password'], $hash) && $usuario;

if ($credencialesValidas) {

    // Evita la fijación de sesión
    session_regenerate_id(true);

    $_SESSION['usuario_id']     = $usuario['id'];
    $_SESSION['usuario_nombre'] = $usuario['nombre'];
    $_SESSION['usuario_rol']    = $usuario['rol'];

    session_write_close();

    loginLimpiarIntentos($claveIntentos);

    echo json_encode(['success' => true]);

} else {

    loginRegistrarFallo($claveIntentos);

    http_response_code(401);

    echo json_encode([
        'success' => false,
        'message' => 'Credenciales incorrectas'
    ]);
}

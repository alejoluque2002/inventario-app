<?php

require_once __DIR__ . '/../auth/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/log.php';

if (($_SESSION['usuario_rol'] ?? '') !== 'admin') {
    responderJson(403, ["success" => false, "message" => "No autorizado"]);
    exit;
}

$database = new Database();
$db = $database->connect();
$log = new Log($db);

/** Registra en el log de actividad sin que un fallo del log rompa la operación ya realizada */
function registrarActividad($log, $accion, $detalle)
{
    try {
        $log->registrar(
            $_SESSION['usuario_id'],
            $_SESSION['usuario_nombre'],
            $accion,
            $detalle
        );
    } catch (Throwable $e) {
        error_log("No se pudo registrar la actividad: " . $e->getMessage());
    }
}

function leerIdUsuario()
{
    return filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
}

function buscarUsuario($db, $id)
{
    $stmt = $db->prepare("SELECT id, nombre, email, rol FROM usuarios WHERE id = :id");
    $stmt->execute([':id' => $id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/** Contraseña temporal aleatoria (sin caracteres ambiguos como 0/O o 1/l/I) */
function generarPasswordTemporal($largo = 12)
{
    $alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $max = strlen($alfabeto) - 1;
    $password = '';

    for ($i = 0; $i < $largo; $i++) {
        $password .= $alfabeto[random_int(0, $max)];
    }

    return $password;
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($metodo) {

    case 'GET':

        $stmt = $db->prepare("SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC");
        $stmt->execute();

        responderJson(200, $stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'PUT':

        $id = leerIdUsuario();
        if ($id === false) {
            responderJson(400, ["success" => false, "message" => "ID inválido"]);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (
            !is_array($data) ||
            !isset($data['nombre'], $data['email'], $data['rol']) ||
            !is_string($data['nombre']) || !is_string($data['email']) || !is_string($data['rol'])
        ) {
            responderJson(400, ["success" => false, "message" => "Nombre, email y rol son requeridos"]);
            break;
        }

        $nombre = trim($data['nombre']);
        $email  = trim($data['email']);
        $rol    = $data['rol'];

        if ($nombre === '' || mb_strlen($nombre) > 100) {
            responderJson(400, ["success" => false, "message" => "El nombre debe tener entre 1 y 100 caracteres"]);
            break;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
            responderJson(400, ["success" => false, "message" => "El email no es válido"]);
            break;
        }

        if (!in_array($rol, ['admin', 'empleado'], true)) {
            responderJson(400, ["success" => false, "message" => "El rol no es válido"]);
            break;
        }

        $usuario = buscarUsuario($db, $id);
        if (!$usuario) {
            responderJson(404, ["success" => false, "message" => "Usuario no encontrado"]);
            break;
        }

        // Evita que el único administrador se quite el rol y deje la app sin admin
        if ($id === (int) $_SESSION['usuario_id'] && $rol !== $usuario['rol']) {
            responderJson(400, ["success" => false, "message" => "No puedes cambiar tu propio rol"]);
            break;
        }

        try {
            $stmt = $db->prepare("
                UPDATE usuarios
                SET nombre = :nombre, email = :email, rol = :rol
                WHERE id = :id
            ");
            $stmt->execute([
                ':nombre' => $nombre,
                ':email'  => $email,
                ':rol'    => $rol,
                ':id'     => $id
            ]);
        } catch (PDOException $e) {
            if (esErrorDuplicado($e)) {
                responderJson(409, ["success" => false, "message" => "El email ya está registrado"]);
                break;
            }
            throw $e;
        }

        registrarActividad($log, 'EDITAR', "Usuario editado: " . $nombre . " (" . $rol . ")");

        responderJson(200, ["success" => true]);
        break;

    case 'POST':

        // Único uso de POST: ?id=N&accion=restablecer_password
        $id = leerIdUsuario();
        if ($id === false || ($_GET['accion'] ?? '') !== 'restablecer_password') {
            responderJson(400, ["success" => false, "message" => "Petición no válida"]);
            break;
        }

        if ($id === (int) $_SESSION['usuario_id']) {
            responderJson(400, [
                "success" => false,
                "message" => "Para cambiar tu propia contraseña usa la opción Contraseña del menú"
            ]);
            break;
        }

        $usuario = buscarUsuario($db, $id);
        if (!$usuario) {
            responderJson(404, ["success" => false, "message" => "Usuario no encontrado"]);
            break;
        }

        $temporal = generarPasswordTemporal();

        $stmt = $db->prepare("UPDATE usuarios SET password = :password WHERE id = :id");
        $stmt->execute([
            ':password' => password_hash($temporal, PASSWORD_DEFAULT),
            ':id'       => $id
        ]);

        // La contraseña no se guarda en el log ni se puede volver a consultar
        registrarActividad($log, 'EDITAR', "Contraseña restablecida: " . $usuario['nombre']);

        header('Cache-Control: no-store');
        responderJson(200, ["success" => true, "password_temporal" => $temporal]);
        break;

    default:
        responderJson(405, ["success" => false, "message" => "Método no permitido"]);
}
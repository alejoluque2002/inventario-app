<?php

require_once __DIR__ . '/../auth/protect.php';

header("Content-Type: application/json");

// Solo el admin puede gestionar las API keys
if (($_SESSION['usuario_rol'] ?? '') !== 'admin') {
    responderJson(403, ["success" => false, "message" => "No autorizado"]);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/log.php';

$database = new Database();
$db = $database->connect();
$log = new Log($db);

$method = $_SERVER['REQUEST_METHOD'];

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

function leerIdKey()
{
    return filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
}

function buscarKey($db, $id)
{
    $stmt = $db->prepare("SELECT id, nombre, activa FROM api_keys WHERE id = :id");
    $stmt->execute([':id' => $id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

switch ($method) {

    case 'GET':

        // Nunca se devuelve la clave ni su hash: solo el prefijo para identificarla
        $stmt = $db->prepare("
            SELECT id, nombre, key_prefix, permisos, activa, created_at
            FROM api_keys
            ORDER BY id ASC
        ");
        $stmt->execute();

        responderJson(200, $stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':

        $data = json_decode(file_get_contents("php://input"), true);

        if (!is_array($data) || !isset($data['nombre']) || !is_string($data['nombre'])) {
            responderJson(400, ["success" => false, "message" => "El nombre es obligatorio"]);
            break;
        }

        $nombre = trim($data['nombre']);

        if ($nombre === '' || mb_strlen($nombre) > 100) {
            responderJson(400, ["success" => false, "message" => "El nombre debe tener entre 1 y 100 caracteres"]);
            break;
        }

        $permisos = $data['permisos'] ?? '';

        if (!in_array($permisos, ['lectura', 'escritura'], true)) {
            responderJson(400, ["success" => false, "message" => "Los permisos deben ser 'lectura' o 'escritura'"]);
            break;
        }

        // 40 caracteres hexadecimales aleatorios (160 bits)
        $clave = bin2hex(random_bytes(20));

        $stmt = $db->prepare("
            INSERT INTO api_keys (nombre, key_prefix, key_hash, permisos)
            VALUES (:nombre, :prefix, :hash, :permisos)
        ");
        $stmt->execute([
            ':nombre'   => $nombre,
            ':prefix'   => substr($clave, 0, 8),
            ':hash'     => hash('sha256', $clave),
            ':permisos' => $permisos
        ]);

        $id = (int) $db->lastInsertId();

        registrarActividad($log, 'CREAR', "API key creada: " . $nombre . " (" . $permisos . ")");

        // Esta es la única vez que se muestra la clave completa
        responderJson(201, [
            "success" => true,
            "id"      => $id,
            "api_key" => $clave
        ]);
        break;

    case 'PATCH':

        $id = leerIdKey();
        if ($id === false) {
            responderJson(400, ["success" => false, "message" => "ID inválido"]);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $activa = is_array($data) && array_key_exists('activa', $data)
            ? filter_var($data['activa'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
            : null;

        if ($activa === null) {
            responderJson(400, ["success" => false, "message" => "Indica 'activa': true o false"]);
            break;
        }

        $key = buscarKey($db, $id);
        if (!$key) {
            responderJson(404, ["success" => false, "message" => "API key no encontrada"]);
            break;
        }

        $stmt = $db->prepare("UPDATE api_keys SET activa = :activa WHERE id = :id");
        $stmt->bindValue(':activa', $activa ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        registrarActividad(
            $log,
            'EDITAR',
            "API key " . ($activa ? "activada" : "revocada") . ": " . $key['nombre']
        );

        responderJson(200, ["success" => true]);
        break;

    case 'DELETE':

        $id = leerIdKey();
        if ($id === false) {
            responderJson(400, ["success" => false, "message" => "ID inválido"]);
            break;
        }

        $key = buscarKey($db, $id);
        if (!$key) {
            responderJson(404, ["success" => false, "message" => "API key no encontrada"]);
            break;
        }

        $stmt = $db->prepare("DELETE FROM api_keys WHERE id = :id");
        $stmt->execute([':id' => $id]);

        registrarActividad($log, 'ELIMINAR', "API key eliminada: " . $key['nombre']);

        responderJson(200, ["success" => true]);
        break;

    default:

        responderJson(405, ["message" => "Método no permitido"]);
}
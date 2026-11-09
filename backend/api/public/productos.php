<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: X-API-Key, Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../auth/api_auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/producto.php';
require_once __DIR__ . '/../../models/log.php';
require_once __DIR__ . '/../../models/movimiento.php';

$database = new Database();
$db = $database->connect();
$producto = new Producto($db);
$log = new Log($db);
$movimientos = new MovimientoStock($db);

$method = $_SERVER['REQUEST_METHOD'];

/** Deja constancia de las escrituras hechas por API key. Un fallo aquí no debe romper la petición. */
function registrarActividadApi($log, $keyData, $accion, $detalle)
{
    try {
        $log->registrar(null, 'API: ' . ($keyData['nombre'] ?? 'desconocida'), $accion, $detalle);
    } catch (Throwable $e) {
        error_log("No se pudo registrar la actividad de la API: " . $e->getMessage());
    }
}

/** Registra el movimiento de stock hecho con API key. Un fallo aquí no debe romper la petición. */
function registrarMovimientoApi($movimientos, $keyData, $productoId, $nombre, $anterior, $nuevo, $tipo = null)
{
    try {
        $movimientos->registrar(
            $productoId,
            $nombre,
            null,
            'API: ' . ($keyData['nombre'] ?? 'desconocida'),
            'api',
            $anterior,
            $nuevo,
            $tipo
        );
    } catch (Throwable $e) {
        error_log("No se pudo registrar el movimiento de stock de la API: " . $e->getMessage());
    }
}

function leerIdApi()
{
    $id = $_GET['id'] ?? null;

    if ($id === null) {
        return null;
    }

    return filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
}

switch ($method) {

    case 'GET':

        autenticarApiKey('lectura');

        $id = leerIdApi();

        if ($id === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID inválido']);
            break;
        }

        if ($id !== null) {
            $encontrado = $producto->obtenerPorId($id);

            if (!$encontrado) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Producto no encontrado']);
            } else {
                echo json_encode(['success' => true, 'data' => $encontrado]);
            }
        } else {
            $productos = $producto->obtenerTodos();
            echo json_encode([
                'success' => true,
                'total'   => count($productos),
                'data'    => $productos
            ]);
        }

        break;

    case 'POST':

        $keyData = autenticarApiKey('escritura');

        $data = json_decode(file_get_contents("php://input"), true);

        $error = $producto->validar($data);
        if ($error !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $error]);
            break;
        }

        try {
            $resultado = $producto->crear($data);
        } catch (PDOException $e) {
            if (esErrorDuplicado($e)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'error' => 'Ya existe un producto con ese código de barras']);
                break;
            }
            throw $e;
        }

        $nuevoId = (int) $db->lastInsertId();

        if ($resultado) {
            registrarActividadApi($log, $keyData, 'CREAR', "Producto creado: " . trim($data['nombre']));
            registrarMovimientoApi($movimientos, $keyData, $nuevoId, trim($data['nombre']), 0, (int) $data['stock'], 'alta');
            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Producto creado']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Error al crear el producto']);
        }

        break;

    case 'PUT':

        $keyData = autenticarApiKey('escritura');

        $id = leerIdApi();

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID requerido']);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        $error = $producto->validar($data);
        if ($error !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $error]);
            break;
        }

        $antes = $producto->obtenerPorId($id);

        if (!$antes) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Producto no encontrado']);
            break;
        }

        try {
            $resultado = $producto->actualizar($id, $data);
        } catch (PDOException $e) {
            if (esErrorDuplicado($e)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'error' => 'Ya existe un producto con ese código de barras']);
                break;
            }
            throw $e;
        }

        if ($resultado) {
            registrarActividadApi($log, $keyData, 'EDITAR', "Producto editado: " . trim($data['nombre']) . " (ID " . $id . ")");
            registrarMovimientoApi($movimientos, $keyData, $id, trim($data['nombre']), (int) $antes['stock'], (int) $data['stock']);
            echo json_encode(['success' => true, 'message' => 'Producto actualizado']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Error al actualizar']);
        }

        break;

    case 'DELETE':

        $keyData = autenticarApiKey('escritura');

        $id = leerIdApi();

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID requerido']);
            break;
        }

        $existente = $producto->obtenerPorId($id);

        if (!$existente) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Producto no encontrado']);
            break;
        }

        $resultado = $producto->eliminar($id);

        if ($resultado) {
            registrarActividadApi($log, $keyData, 'ELIMINAR', "Producto eliminado: " . $existente['nombre'] . " (ID " . $id . ")");
            registrarMovimientoApi($movimientos, $keyData, $id, $existente['nombre'], (int) $existente['stock'], 0, 'baja');
            echo json_encode(['success' => true, 'message' => 'Producto eliminado']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Error al eliminar']);
        }

        break;

    default:

        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
}
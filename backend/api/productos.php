<?php

require_once __DIR__ . '/../auth/protect.php';

header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/producto.php';
require_once __DIR__ . '/../models/log.php';
require_once __DIR__ . '/../services/alertas.php';

$database = new Database();
$db = $database->connect();

$producto = new Producto($db);
$log = new Log($db);

$method = $_SERVER['REQUEST_METHOD'];
$esAdmin = ($_SESSION['usuario_rol'] ?? '') === 'admin';

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

function enAlertaDeStock($datos)
{
    return (int) $datos['stock'] <= (int) $datos['stock_minimo'];
}

/**
 * Envía el email de alerta solo cuando el producto acaba de entrar en alerta
 * o ha seguido bajando su stock estando ya en alerta (evita un email por cada edición).
 * $antes puede ser null (producto nuevo).
 */
function alertarSiProcede($db, $antes, $despues)
{
    if (!enAlertaDeStock($despues)) {
        return;
    }

    $yaEnAlerta = $antes !== null && enAlertaDeStock($antes);
    $haBajado   = $antes === null || (int) $despues['stock'] < (int) $antes['stock'];

    if ($yaEnAlerta && !$haBajado) {
        return;
    }

    try {
        verificarStockYAlertar($db, destinatarioAlertas());
    } catch (Throwable $e) {
        error_log("Error al enviar la alerta de stock: " . $e->getMessage());
    }
}

function leerIdProducto()
{
    return filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
}

function denegarSiNoEsAdmin($esAdmin)
{
    if (!$esAdmin) {
        responderJson(403, ["success" => false, "message" => "No autorizado"]);
        exit;
    }
}

switch ($method) {

    case 'GET':

        responderJson(200, $producto->obtenerTodos());
        break;

    case 'POST':

        denegarSiNoEsAdmin($esAdmin);

        $data = json_decode(file_get_contents("php://input"), true);

        $error = $producto->validar($data);
        if ($error !== null) {
            responderJson(400, ["success" => false, "message" => $error]);
            break;
        }

        try {
            $resultado = $producto->crear($data);
        } catch (PDOException $e) {
            if (esErrorDuplicado($e)) {
                responderJson(409, ["success" => false, "message" => "Ya existe un producto con ese código de barras"]);
                break;
            }
            throw $e;
        }

        if (!$resultado) {
            responderJson(500, ["success" => false, "message" => "No se pudo crear el producto"]);
            break;
        }

        registrarActividad($log, 'CREAR', "Producto creado: " . trim($data['nombre']));

        responderJson(200, ["success" => true], true);

        alertarSiProcede($db, null, $data);

        break;

    case 'PUT':

        denegarSiNoEsAdmin($esAdmin);

        $id = leerIdProducto();
        if ($id === false) {
            responderJson(400, ["success" => false, "message" => "ID de producto inválido"]);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        $error = $producto->validar($data);
        if ($error !== null) {
            responderJson(400, ["success" => false, "message" => $error]);
            break;
        }

        $antes = $producto->obtenerPorId($id);
        if (!$antes) {
            responderJson(404, ["success" => false, "message" => "Producto no encontrado"]);
            break;
        }

        try {
            $resultado = $producto->actualizar($id, $data);
        } catch (PDOException $e) {
            if (esErrorDuplicado($e)) {
                responderJson(409, ["success" => false, "message" => "Ya existe un producto con ese código de barras"]);
                break;
            }
            throw $e;
        }

        if (!$resultado) {
            responderJson(500, ["success" => false, "message" => "No se pudo actualizar el producto"]);
            break;
        }

        registrarActividad($log, 'EDITAR', "Producto editado: " . trim($data['nombre']) . " (ID " . $id . ")");

        responderJson(200, ["success" => true], true);

        alertarSiProcede($db, $antes, $data);

        break;

    case 'PATCH':

        // Ajuste de stock (scanner): permitido a cualquier usuario autenticado.
        // Cuerpo: {"delta": 1} para sumar/restar o {"stock": 10} para fijar un valor exacto.
        $id = leerIdProducto();
        if ($id === false) {
            responderJson(400, ["success" => false, "message" => "ID de producto inválido"]);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!is_array($data)) {
            responderJson(400, ["success" => false, "message" => "Datos inválidos"]);
            break;
        }

        $antes = $producto->obtenerPorId($id);
        if (!$antes) {
            responderJson(404, ["success" => false, "message" => "Producto no encontrado"]);
            break;
        }

        if (isset($data['delta'])) {

            $delta = filter_var($data['delta'], FILTER_VALIDATE_INT);

            if ($delta === false || $delta === 0 || abs($delta) > 1000000) {
                responderJson(400, ["success" => false, "message" => "El ajuste debe ser un entero distinto de 0"]);
                break;
            }

            if (!$producto->ajustarStock($id, $delta)) {
                responderJson(409, ["success" => false, "message" => "El stock no puede ser negativo"]);
                break;
            }

        } elseif (isset($data['stock'])) {

            $nuevo = filter_var(
                $data['stock'],
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 0, 'max_range' => 2147483647]]
            );

            if ($nuevo === false) {
                responderJson(400, ["success" => false, "message" => "El stock debe ser un entero mayor o igual que 0"]);
                break;
            }

            $producto->establecerStock($id, $nuevo);

        } else {
            responderJson(400, ["success" => false, "message" => "Indica 'delta' o 'stock'"]);
            break;
        }

        $despues = $producto->obtenerPorId($id);

        registrarActividad(
            $log,
            'EDITAR',
            "Stock ajustado: " . $antes['nombre'] . " (ID " . $id . "): " . $antes['stock'] . " -> " . $despues['stock']
        );

        responderJson(200, ["success" => true, "stock" => (int) $despues['stock']], true);

        alertarSiProcede($db, $antes, $despues);

        break;

    case 'DELETE':

        denegarSiNoEsAdmin($esAdmin);

        $id = leerIdProducto();
        if ($id === false) {
            responderJson(400, ["success" => false, "message" => "ID de producto inválido"]);
            break;
        }

        $existente = $producto->obtenerPorId($id);
        if (!$existente) {
            responderJson(404, ["success" => false, "message" => "Producto no encontrado"]);
            break;
        }

        if (!$producto->eliminar($id)) {
            responderJson(500, ["success" => false, "message" => "No se pudo eliminar el producto"]);
            break;
        }

        registrarActividad($log, 'ELIMINAR', "Producto eliminado: " . $existente['nombre'] . " (ID " . $id . ")");

        responderJson(200, ["success" => true]);

        break;

    default:

        responderJson(405, ["message" => "Método no permitido"]);
}

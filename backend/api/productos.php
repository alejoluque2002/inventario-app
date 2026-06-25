<?php

require_once "../auth/protect.php";

header("Content-Type: application/json");

require_once "../config/database.php";
require_once "../models/producto.php";
require_once "../models/log.php";

$database = new Database();
$db = $database->connect();

$producto = new Producto($db);
$log = new Log($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':

        echo json_encode($producto->obtenerTodos());
        break;

    case 'POST':

        if ($_SESSION['usuario_rol'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "No autorizado"]);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $resultado = $producto->crear($data);

        echo json_encode(["success" => $resultado]);

        if ($resultado) {
            $log->registrar(
                $_SESSION['usuario_id'],
                $_SESSION['usuario_nombre'],
                'CREAR',
                "Producto creado: " . ($data['nombre'] ?? '')
            );
        }

        break;

    case 'PUT':

        if ($_SESSION['usuario_rol'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "No autorizado"]);
            break;
        }

        $id = $_GET['id'] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        $resultado = $producto->actualizar($id, $data);

        echo json_encode(["success" => $resultado]);

        if ($resultado) {
            $log->registrar(
                $_SESSION['usuario_id'],
                $_SESSION['usuario_nombre'],
                'EDITAR',
                "Producto editado ID: " . $id
            );
        }

        break;

    case 'DELETE':

        if ($_SESSION['usuario_rol'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "No autorizado"]);
            break;
        }

        $id = $_GET['id'] ?? null;
        $resultado = $producto->eliminar($id);

        echo json_encode(["success" => $resultado]);

        if ($resultado) {
            $log->registrar(
                $_SESSION['usuario_id'],
                $_SESSION['usuario_nombre'],
                'ELIMINAR',
                "Producto eliminado ID: " . $id
            );
        }

        break;

    default:

        http_response_code(405);
        echo json_encode(["message" => "Método no permitido"]);
}
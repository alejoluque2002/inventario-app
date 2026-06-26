<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: X-API-Key, Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../../auth/api_auth.php";
require_once "../../config/database.php";
require_once "../../models/producto.php";

$database = new Database();
$db = $database->connect();
$producto = new Producto($db);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':

        autenticarApiKey('lectura');

        $id = $_GET['id'] ?? null;

        if ($id) {
            $todos = $producto->obtenerTodos();
            $encontrado = array_filter($todos, fn($p) => $p['id'] == $id);
            $resultado = array_values($encontrado);

            if (empty($resultado)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Producto no encontrado']);
            } else {
                echo json_encode(['success' => true, 'data' => $resultado[0]]);
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

        autenticarApiKey('escritura');

        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Datos inválidos']);
            break;
        }

        $resultado = $producto->crear($data);

        if ($resultado) {
            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Producto creado']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Error al crear el producto']);
        }

        break;

    case 'PUT':

        autenticarApiKey('escritura');

        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID requerido']);
            break;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $resultado = $producto->actualizar($id, $data);

        if ($resultado) {
            echo json_encode(['success' => true, 'message' => 'Producto actualizado']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Error al actualizar']);
        }

        break;

    case 'DELETE':

        autenticarApiKey('escritura');

        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID requerido']);
            break;
        }

        $resultado = $producto->eliminar($id);

        if ($resultado) {
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
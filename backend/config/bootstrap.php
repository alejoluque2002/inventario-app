<?php

/**
 * Bootstrap común del backend:
 *  - lectura de variables de entorno (.env en la raíz del proyecto)
 *  - gestión de errores (nunca se muestran detalles al cliente)
 *  - cabeceras de seguridad por defecto
 *  - helpers de respuesta JSON
 */

if (!function_exists('env')) {

    /**
     * Devuelve una variable de entorno. Prioridad: .env > entorno del sistema > $default.
     */
    function env($clave, $default = null)
    {
        static $cargado = false;
        static $valores = [];

        if (!$cargado) {
            $cargado = true;
            $ruta = dirname(__DIR__, 2) . '/.env';

            if (is_readable($ruta)) {
                $lineas = file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

                foreach ($lineas as $linea) {
                    $linea = trim($linea);

                    if ($linea === '' || $linea[0] === '#' || strpos($linea, '=') === false) {
                        continue;
                    }

                    [$k, $v] = explode('=', $linea, 2);
                    $k = trim($k);
                    $v = trim($v);

                    if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) {
                        $v = substr($v, 1, -1);
                    }

                    $valores[$k] = $v;
                }
            }
        }

        if (array_key_exists($clave, $valores)) {
            return $valores[$clave];
        }

        $sistema = getenv($clave);

        return $sistema !== false ? $sistema : $default;
    }
}

// Los errores se registran en el log del servidor, no se envían al navegador
ini_set('display_errors', '0');
ini_set('log_errors', '1');

set_exception_handler(function ($e) {
    error_log(
        'Excepción no capturada: ' . $e->getMessage() .
        ' en ' . $e->getFile() . ':' . $e->getLine()
    );

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }

    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor'
    ]);
});

if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

if (!function_exists('responderJson')) {

    /**
     * Envía una respuesta JSON. Con $liberar = true cierra la conexión con el
     * cliente y permite seguir ejecutando tareas lentas (p. ej. enviar emails)
     * sin que el usuario tenga que esperar.
     */
    function responderJson($codigo, $datos, $liberar = false)
    {
        $json = json_encode($datos);

        http_response_code($codigo);
        header('Content-Type: application/json');

        if (!$liberar) {
            echo $json;
            return;
        }

        ignore_user_abort(true);
        header('Content-Length: ' . strlen($json));
        header('Connection: close');

        echo $json;

        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();

        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
    }
}

if (!function_exists('esErrorDuplicado')) {

    /** true si la excepción de PDO es una violación de clave única (SQLSTATE 23000) */
    function esErrorDuplicado($e)
    {
        return $e instanceof PDOException && (string) $e->getCode() === '23000';
    }
}

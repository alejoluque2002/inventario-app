<?php

/**
 * Límite de intentos de login (fuerza bruta).
 * Se guarda en ficheros temporales para no depender de ninguna tabla extra.
 * Clave: email + IP. 5 fallos => bloqueo de 15 minutos desde el último fallo.
 */

const LOGIN_MAX_INTENTOS = 5;
const LOGIN_VENTANA_SEGUNDOS = 900;

function rutaIntentosLogin($clave)
{
    return sys_get_temp_dir() . DIRECTORY_SEPARATOR
        . 'inventario_login_' . hash('sha256', $clave) . '.json';
}

function leerIntentosLogin($clave)
{
    $vacio = ['n' => 0, 't' => 0];
    $ruta = rutaIntentosLogin($clave);

    if (!is_file($ruta)) {
        return $vacio;
    }

    $datos = json_decode((string) @file_get_contents($ruta), true);

    if (!is_array($datos) || !isset($datos['n'], $datos['t'])) {
        return $vacio;
    }

    if (time() - (int) $datos['t'] > LOGIN_VENTANA_SEGUNDOS) {
        return $vacio;
    }

    return ['n' => (int) $datos['n'], 't' => (int) $datos['t']];
}

function loginBloqueado($clave)
{
    $datos = leerIntentosLogin($clave);
    return $datos['n'] >= LOGIN_MAX_INTENTOS;
}

function loginRegistrarFallo($clave)
{
    $datos = leerIntentosLogin($clave);

    @file_put_contents(
        rutaIntentosLogin($clave),
        json_encode(['n' => $datos['n'] + 1, 't' => time()]),
        LOCK_EX
    );
}

function loginLimpiarIntentos($clave)
{
    $ruta = rutaIntentosLogin($clave);

    if (is_file($ruta)) {
        @unlink($ruta);
    }
}

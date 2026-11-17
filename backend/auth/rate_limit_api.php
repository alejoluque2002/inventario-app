<?php

/**
 * Límite de peticiones por API key: ventana fija de 60 segundos.
 * Se guarda en un fichero temporal por clave (igual que el límite de login).
 * Devuelve [permitido, segundosHastaReinicio].
 *
 * Si el fichero no se puede abrir, no se bloquea la API (es preferible a
 * dejar de dar servicio por un fallo del sistema de ficheros temporal).
 */
function apiRegistrarPeticion($keyId, $limite)
{
    if ($limite <= 0) {
        return [true, 0];
    }

    $ruta = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'inventario_api_' . (int) $keyId . '.json';
    $ahora = time();

    $fp = @fopen($ruta, 'c+');
    if ($fp === false) {
        return [true, 0];
    }

    flock($fp, LOCK_EX);

    $datos = json_decode((string) stream_get_contents($fp), true);

    if (
        !is_array($datos) || !isset($datos['inicio'], $datos['n']) ||
        $ahora - (int) $datos['inicio'] >= 60
    ) {
        $datos = ['inicio' => $ahora, 'n' => 0];
    }

    $datos['n'] = (int) $datos['n'] + 1;
    $permitido = $datos['n'] <= $limite;
    $espera = max(1, 60 - ($ahora - (int) $datos['inicio']));

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($datos));
    flock($fp, LOCK_UN);
    fclose($fp);

    return [$permitido, $espera];
}
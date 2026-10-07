<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../libs/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../libs/PHPMailer/src/SMTP.php';
require_once __DIR__ . '/../libs/PHPMailer/src/Exception.php';

/**
 * Envía un email HTML por SMTP. Las credenciales se leen del .env
 * (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM_NAME).
 * Si no están configuradas, no se envía nada y se devuelve false.
 */
function enviarEmail($destinatario, $asunto, $cuerpo)
{
    $usuario = (string) env('MAIL_USER', '');
    $clave   = (string) env('MAIL_PASS', '');

    if ($usuario === '' || $clave === '' || !$destinatario) {
        error_log('Email no enviado: MAIL_USER / MAIL_PASS / destinatario no configurados');
        return false;
    }

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = env('MAIL_HOST', 'smtp.gmail.com');
        $mail->SMTPAuth   = true;
        $mail->Username   = $usuario;
        $mail->Password   = $clave;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int) env('MAIL_PORT', 587);
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 10;

        $mail->setFrom($usuario, env('MAIL_FROM_NAME', 'Gestor de Inventario'));
        $mail->addAddress($destinatario);

        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body    = $cuerpo;

        $mail->send();
        return true;

    } catch (Exception $e) {
        error_log("Error al enviar email: " . $mail->ErrorInfo);
        return false;
    } catch (\Throwable $e) {
        error_log("Error inesperado al enviar email: " . $e->getMessage());
        return false;
    }
}
